import { exec } from "child_process";

function randomDelay() {
  const min = 8 * 60 * 60 * 1000; // 8 jam
  const max = 10 * 60 * 60 * 1000; // 10 jam
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function startLoop() {
  console.log("🚀 Menjalankan deploy.js ...");
  exec("node deploy.js", (err, stdout, stderr) => {
    if (err) console.error("❌ Error deploy:", err);
    console.log(stdout);
    if (stderr) console.error(stderr);

    const delay = randomDelay();
    const nextRun = new Date(Date.now() + delay);
    console.log(
      `⏳ Deploy berikutnya sekitar: ${nextRun.toLocaleString()} (delay ${Math.floor(
        delay / 3600000
      )} jam)`
    );
    setTimeout(startLoop, delay);
  });
}

startLoop();
