const express = require("express");
const fs = require("fs");
const path = require("path");
const ytdl = require("ytdl-core");
const cors = require("cors");

const app = express();
app.use(express.json()); // For JSON data
app.use(express.urlencoded({ extended: true })); // For URL-encoded data
app.use(cors());
const port = 4000;

const replaceSpecialCharacters = (inputString) => {
  const replacedString = inputString.replace(/[^\w\s]/gi, "");
  return replacedString.replaceAll(" ", "_");
};

const deleteChunk = (fileName) => {
  console.log("deleting", fileName);
  fs.unlinkSync("videos/" + fileName + ".mp4");
};

const downloadVideoFromLink = (songLink, info) => {
  return new Promise((resolve, reject) => {
    if (+info.videoDetails.lengthSeconds > 600) {
      console.log("limit exceed");
      reject();
    } else {
      const videoFormat = info.formats.filter(
        (format) => format.container === "mp4" && format.hasAudio
      )[0];
      const fileName =
        replaceSpecialCharacters(info.videoDetails.title) || "song";

      ytdl(songLink, { format: videoFormat })
        .pipe(fs.createWriteStream("videos/" + fileName + ".mp4"))
        .on("finish", () => {
          console.log("ytdl finish");
          resolve(fileName);
        })
        .on("error", (err) => {
          console.log("ytdl error", err);
          reject();
        });
    }
  });
};

app.post("/get-song", async (req, res) => {
  const { songLink } = req.body;
  const resp = await ytdl
    .getInfo(songLink)
    .then((info) => {
      const fileName =
        replaceSpecialCharacters(info.videoDetails.title) || "song";

      if (!fs.existsSync("videos/" + fileName + ".mp4")) {
        return downloadVideoFromLink(songLink, info);
      }
      return {
        songName: fileName,
      };
    })
    .then((res) => {
      if (typeof res === "string") {
        return res;
      }
      return res.songName;
    })
    .catch((reason) => {
      console.error("Cannot get download info. Reason shown below.", reason);
      return null;
    });
  setTimeout(() => {
    if (resp) {
      deleteChunk(resp);
    }
  }, 60000);
  res.json({ songName: resp });
});

app.get("/videos/:videoName", (req, res) => {
  const videoName = req.params.videoName;
  const videoPath = path.join(__dirname, "videos", videoName);

  // Check if the file exists
  fs.access(videoPath, fs.constants.F_OK, (err) => {
    if (err) {
      res.status(404).send("Video not found");
    } else {
      res.sendFile(videoPath);
    }
  });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
