import app from "./app.js";
import { port } from "./config/constants.js";

import Connection from "./database/connection.js";

app.get("/", (req, res) => {
  res.send("ok");
});

app.listen(port, async () => {
  await Connection();

  console.log(`Backend listening on port ${port}`);
});
