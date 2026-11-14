import { downloadMediaMessage } from "baileys";
import WSF from "wa-sticker-formatter";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import memoryManager from "../../utils/memory.js";

let ffmpegPath1 = process.env.FFMPEG_PATH;

if (!ffmpegPath1) {
  try {
    const { default: ffmpegStatic } = await import("ffmpeg-static");
    const { existsSync } = await import("fs");
    ffmpegPath1 = ffmpegStatic && existsSync(ffmpegStatic) ? ffmpegStatic : "ffmpeg";
  } catch {
    ffmpegPath1 = "ffmpeg";
  }
}

ffmpeg.setFfmpegPath(ffmpegPath1);

export default () => ({
  cmd: ["stickercrop"],
  desc: "Crop replied media to sticker",
  usage: "stickercrop (reply to image/video/sticker)",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, extendedMessageOriginal } = msgInfoObj;

    if (!extendedMessageOriginal?.quotedMessage) {
      return sendMessageWTyping(from, {
        text: "❌ Reply to an image, video, or sticker to crop it.",
      }, { quoted: msg });
    }

    try {
      const quotedMsg = extendedMessageOriginal.quotedMessage;
      const mediaType = Object.keys(quotedMsg)[0];
      
      if (!["imageMessage", "videoMessage", "stickerMessage"].includes(mediaType)) {
        return sendMessageWTyping(from, {
          text: "❌ Reply to an image, video, or sticker to crop it.",
        }, { quoted: msg });
      }

      const stream = await downloadMediaMessage(
        { message: quotedMsg },
        "stream",
        {},
        { logger: console }
      );

      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      const tempInput = memoryManager.generateTempFileName(".mp4");
      const tempOutput = memoryManager.generateTempFileName(".webp");
      
      fs.writeFileSync(tempInput, buffer);

      const FOCAL_POINTS = ["top", "bottom", "left", "right", "center"];
      const focalPoint = FOCAL_POINTS.find((p) => args.includes(p)) || "center";

      const buildCropFilter = (pos) => {
        const s = `min(iw\\,ih)`;
        const cx = `(iw-min(iw\\,ih))/2`;
        const cy = `(ih-min(iw\\,ih))/2`;
        const xMap = { center: cx, top: cx, bottom: cx, left: `0`, right: `iw-min(iw\\,ih)` };
        const yMap = { center: cy, top: `0`, bottom: `ih-min(iw\\,ih)`, left: cy, right: cy };
        return `crop=${s}:${s}:${xMap[pos]}:${yMap[pos]},scale=512:512,fps=fps=15`;
      };

      const isVideo = mediaType === "videoMessage";

      await new Promise((resolve, reject) => {
        ffmpeg(tempInput)
          .on("error", (err) => {
            memoryManager.safeUnlink(tempInput);
            memoryManager.safeUnlink(tempOutput);
            reject(err);
          })
          .on("end", async () => {
            try {
              const stickerBuffer = await WSF.setMetadata("eva", "jacktheboss220", tempOutput);
              await sendMessageWTyping(from, { sticker: Buffer.from(stickerBuffer) }, { quoted: msg });
              resolve();
            } catch (err) {
              reject(err);
            } finally {
              memoryManager.safeUnlink(tempInput);
              memoryManager.safeUnlink(tempOutput);
            }
          })
          .addOutputOptions([
            "-vcodec", "libwebp",
            "-vf", buildCropFilter(focalPoint),
            "-lossless", "0",
            "-q:v", "75",
            "-loop", "0",
            "-preset", "default",
            "-an",
            "-s", "512:512",
          ])
          .toFormat("webp")
          .save(tempOutput);
      });
    } catch (error) {
      console.error("StickerCrop error:", error);
      return sendMessageWTyping(from, {
        text: "❌ Failed to crop media. Please try again.",
      }, { quoted: msg });
    }
  },
});