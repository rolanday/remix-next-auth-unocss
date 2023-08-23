import { json, type LinksFunction } from "@remix-run/node";
import reset from "@unocss/reset/tailwind-compat.css";
import styles from "./styles.css";
import { SessionProvider } from "next-auth/react";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: reset },
  { rel: "stylesheet", href: styles },
];

export const loader = async () => {
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (!nextAuthUrl) throw new Error("NEXTAUTH_URL is not set");
  return json({
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  });
};

export default function App() {
  const { NEXTAUTH_URL } = useLoaderData<typeof loader>();
  return (
    <SessionProvider>
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <Meta />
          <Links />
        </head>
        <body>
          <Outlet />

          <script
            // NextAuth session provider reads window.process.env.NEXTAUTH_URL, so
            // is using, then you'll need to set it here, else will fail.
            // credit: https://sergiodxa.com/articles/use-process-env-client-side-with-remix
            dangerouslySetInnerHTML={{
              __html: `window.process = ${JSON.stringify({
                env: {
                  NEXTAUTH_URL,
                },
              })}`,
            }}
          />
          <ScrollRestoration />
          <Scripts />
          <LiveReload />
        </body>
      </html>
    </SessionProvider>
  );
}
