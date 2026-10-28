import fs from "node:fs";
import net from "node:net";

/** Servidor SMTP mínimo: guarda cada correo en un archivo para que las pruebas lean el código de acceso. */
export function startSmtpSink(port: number, file: string): Promise<() => Promise<void>> {
  fs.writeFileSync(file, "");
  const server = net.createServer((socket) => {
    let data = false;
    let buf: string[] = [];
    let pending = "";
    const reply = (line: string) => socket.write(`${line}\r\n`);
    reply("220 sink ESMTP");
    socket.on("data", (chunk) => {
      pending += chunk.toString("utf8");
      const lines = pending.split("\r\n");
      pending = lines.pop() ?? "";
      for (const line of lines) {
        if (data) {
          if (line === ".") {
            data = false;
            fs.appendFileSync(file, `${buf.join("\n")}\n=====\n`);
            buf = [];
            reply("250 ok");
          } else buf.push(line);
          continue;
        }
        const cmd = line.toUpperCase();
        if (cmd.startsWith("EHLO") || cmd.startsWith("HELO")) reply("250 sink");
        else if (cmd.startsWith("DATA")) {
          data = true;
          reply("354 go");
        } else if (cmd.startsWith("QUIT")) {
          reply("221 bye");
          socket.end();
        } else reply("250 ok");
      }
    });
    socket.on("error", () => undefined);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(() => new Promise((r) => server.close(() => r()))));
  });
}
