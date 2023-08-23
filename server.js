import * as fs from "node:fs";

import { createRequestHandler } from "@remix-run/express";
import { broadcastDevReady, installGlobals } from "@remix-run/node";
import chokidar from "chokidar";
import compression from "compression";
import express, { Router } from "express";
import morgan from "morgan";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import sourceMapSupport from "source-map-support";
import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";

/** Compatibility layer for `next-auth` for `express` apps.  */
// credit: https://github.com/s-kris/vite-ssr-starter
const authActions =
  /^\/api\/auth\/(session|signin\/?\w*|signout|csrf|providers|callback\/\w+|_log)$/;
const router = Router();
export default function NextAuthMiddleware(options) {
  return router
    .use(bodyParser.urlencoded({ extended: false }))
    .use(bodyParser.json())
    .use(cookieParser())
    .all(authActions, (req, res, next) => {
      if (req.method !== "POST" && req.method !== "GET") {
        return next();
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      req.query.nextauth = req.path.split("/").slice(3);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      NextAuth.default(req, res, options);
    });
}

sourceMapSupport.install();
installGlobals();

const BUILD_PATH = "./build/index.js";
/**
 * @type { import('@remix-run/node').ServerBuild | Promise<import('@remix-run/node').ServerBuild> }
 */
let build = await import(BUILD_PATH);

const app = express();

app.use(compression());

app.use(
  NextAuthMiddleware({
    secret: process.env.NEXT_AUTH_SECRET,
    providers: [
      GithubProvider.default({
        clientId: process.env.OAUTH_GITHUB_ID,
        clientSecret: process.env.OAUTH_GITHUB_SECRET,
      }),
    ],
  })
);

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable("x-powered-by");

// Remix fingerprints its assets so we can cache forever.
app.use(
  "/build",
  express.static("public/build", { immutable: true, maxAge: "1y" })
);

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static("public", { maxAge: "1h" }));

app.use(morgan("tiny"));

app.all(
  "*",
  process.env.NODE_ENV === "development"
    ? createDevRequestHandler()
    : createRequestHandler({
        build,
        mode: process.env.NODE_ENV,
      })
);

const port = process.env.PORT || 3000;
app.listen(port, async () => {
  console.log(`Express server listening on port ${port}`);

  if (process.env.NODE_ENV === "development") {
    broadcastDevReady(build);
  }
});

function createDevRequestHandler() {
  const watcher = chokidar.watch(BUILD_PATH, { ignoreInitial: true });

  watcher.on("all", async () => {
    // 1. purge require cache && load updated server build
    const stat = fs.statSync(BUILD_PATH);
    build = import(BUILD_PATH + "?t=" + stat.mtimeMs);
    // 2. tell dev server that this app server is now ready
    broadcastDevReady(await build);
  });

  return async (req, res, next) => {
    try {
      //
      return createRequestHandler({
        build: await build,
        mode: "development",
      })(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}
