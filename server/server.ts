import * as express from "express";

import * as SocketIO from "socket.io";
import * as http from "http";

import * as cluster from "cluster";

import sticky = require("../local_node_modules/sticky-session/lib/sticky-session");

import { Spell } from "../common/Spell";
import { StatBlock } from "../common/StatBlock";
import * as DB from "./dbconnection";
import { getDbConnectionString } from "./getDbConnectionString";
import { GetPlayerViewManager } from "./playerviewmanager";
import ConfigureRoutes from "./routes";
import GetSessionMiddleware from "./session";
import ConfigureSockets from "./sockets";

async function improvedInitiativeServer() {
  const app = express();
  app.set("trust proxy", true);
  const server = new http.Server(app);

  const dbConnectionString = await getDbConnectionString();
  await DB.initialize(dbConnectionString);

  const playerViews = await GetPlayerViewManager();

  const session = await GetSessionMiddleware(process.env.REDIS_URL);
  app.use(session);

  ConfigureRoutes(app, playerViews);

  const defaultPort = parseInt(process.env.PORT || "80");

  if (process.env.ENABLE_CONCURRENCY) {
    await sticky.listen(server, defaultPort, {
      workers: parseInt(process.env.WEB_CONCURRENCY || "1"),
      proxyHeader: "x-forwarded-for",
      env: {
        DB_CONNECTION_STRING: dbConnectionString,
        ...process.env
      }
    });
  } else {
    await server.listen(defaultPort);
    console.log("Launched server without concurrency.");
  }

  const io = new SocketIO.Server(server);
  ConfigureSockets(io, session, playerViews);

  if (cluster.worker) {
    console.log("Improved Initiative node %s running", cluster.worker.id);
  }
}

improvedInitiativeServer();
