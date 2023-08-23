# remix+next-auth (minimal)

This project demonstrates a streamlined implementation using [NextAuth.js](https://next-auth.js.org) to authenticate users on Remix stack. NextAuth.js is the full-blown authentication stack developed for Next.js (as opposed to the [Auth.js](https://authjs.dev) core version, which is in-development at time this repo was created). The project is configured for sign-in using Github, but other providers can be added using the steps outline in the NextAuth.js documentation.

> Note: This solution for using NextAuth with Remix requries using the Express Server template, and should also be easily adapted to work with Fastify (but not shown here). No attempt has been made use with Remix App Server, Architect, Fly.io, Netlfiy, Vercel, etc. You're on your own to try.

This project is also configured for Unocss, which I prefer to Tailwind because provides marginally more concise tokens (but also has tailwind compat layer if prefer to use same), and offers additional flexibilty over Tailwind.

## Test drive

Before starting the dev server to see NextAuth in action on Remix, edit `.env.template` to include your GitHub OAuth ID and secret, and rename the file to `.env`. You'll also want to set your Github Oauth callback URL to be:

```
http://localhost:3000/api/auth
```

 Then launch the dev server:

```
npm run dev
```

The above assumes assumes your dev server is running on `http://localhost:3000`

2. Point your browser to `http://localhost:3000`and sign-in

## Usage

This project uses the default NextAuth.js configuraiton to store session state locally in an encrypted JWT cookie. You have two options for handling sign-in/sign-out and getting access to session state.

1. Navigate to NextAuth.js the signin and signout REST APIs to sign in and out, and handle loading session state into the client yourself using the standard Remix loader mechaism. You can optionally create own context provider if desired.
2. Use the NextAuth SessionProvider that comes with NextAuth, and sign in and out using the helper functions that NextAuth provides.

> Note: This project is configured to use both approaches for demonstration purposes only. See source code comments for additional details.

### Option 1: You handle getting session info

NextAuth stores session info in an encrypted cookie, which you can read server-side (in a loader or action function). See `app/routes/_index.tsx` for sample code loading the session info from cookie -- you need only the `decode` function that NextAuth provides and the secret set in your environment. The JWT contains the info needed to create a NextAuth Session object, which has the following shape:

```
const sessionSchema = z.object({
  user: z.object({
    name: z.string(),
    email: z.string().email(),
    image: z.string().url().optional(),
  }),
  expires: z.string().datetime(),
});
```

Return the session object from your loader to access from the client using `useLoaderData`.

To sign in and out, navigate to the corresponding REST API endpoints created by NextAuth.js. Navigate using whatever mechanisim suits you -- a link or imperatively with useNavigate and button clicks. 

```
 /api/auth/signin
 /api/auth/signout
```

This approach requires that you only registerNextAuth with Express middleware, in server.js.

### Option 2: Use NextAuth SessionProvider

Alternatively, you can use the SessionProvider packaged with NextAuth to handle getting session info for you, including conveinence functions for signing in and out. Simply wrap your document root in SessionProvider as shown in `app/root.tsx` and you're good to go. Almost.

```
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
          <ScrollRestoration />
          <Scripts />
          <LiveReload />
        </body>
      </html>
    </SessionProvider>
```

The gotcha with approach is that NextAuth SessionProvider reads `process.env.NEXTAUTH_URL`  *from the client*, which is typically only available on the server. The solution is to use `dangerouslySetInnerHTML`to make this prop available as shown here:

​    <SessionProvider>
​      <html lang="en">
​        <head>
​          <meta charSet="utf-8" />
​          <meta name="viewport" content="width=device-width,initial-scale=1" />
​          <Meta />
​          <Links />
​        </head>
​        <body>
​          <Outlet />


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

With this out of the way, you can use NextAuth `import { useSession, signIn, signOut } from "next-auth/react";` just as you would on NextJS.

## Alternatives

Other popular options that I have first-hand experience authenticating with on Remix are:

* [Remix-auth](https://github.com/sergiodxa/remix-auth)
* [Clerk](https://clerk.com)

Afacit, remix-auth is the closest thing to a defacto auth solution on Remix (Remix's NextAuth, if you will), and it's a great option that works with any of the Remix adapters (Express, Fly.io, Vercel, etc.). Same goes for Clerk, which is freemium product, and has the benefit of being exceedingly easy to integrate at the cost of flexibility compared to remix-auth. Clerk is also a paid service after exceeding monthly active users allowance.

**Why this project?**

I created this project for myself because I also evaluate SvelteKit, Solid, and Qwik for related projects, which all include Authjs adapters. I also have my own adapter for managing session state is shareable across all NextAuth/Authjs supported platforms (Nextjs, SvelteKit, Solid, Qwik, and whatever else comes along that adapts to Authjs -- the platform agonstic implementation of NextAuth). NextAuth also has high usage (i.e., battle-hardend) and requires me to write less authcode (e.g, session refresh).
