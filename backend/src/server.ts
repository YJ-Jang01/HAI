import "dotenv/config";

import { app } from "./app.js";

const port = Number(process.env.PORT ?? 8002);

app.listen(port, () => {
  console.log(`Backend API listening on http://127.0.0.1:${port}`);
});
