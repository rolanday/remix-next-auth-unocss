import { json, type LoaderArgs, type V2_MetaFunction } from "@remix-run/node";
import { useSession, signIn, signOut } from "next-auth/react";
import { decode } from "next-auth/jwt";
import { z } from "zod";
import { useLoaderData } from "@remix-run/react";

// Create zod schema for validating session cookie is going with option 1
// from README.md. Needs to look like { Session } from "next-auth"
const sessionSchema = z.object({
  user: z.object({
    name: z.string(),
    email: z.string().email(),
    image: z.string().url().optional(),
  }),
  expires: z.string().datetime(),
});
type Session = z.infer<typeof sessionSchema>;

const parseCookieHeader = (c: string) =>
  c
    .split(";")
    .map((v: string) => v.split("="))
    .reduce((acc: Record<string, string>, v) => {
      acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
      return acc;
    }, {});

export const loader = async ({ request }: LoaderArgs) => {
  /**
   * This sample code decodes the JWT and returns ths session info. This is
   * only needed if opting not to use NextAuth SessionProvider to get at
   * session info using `useSession()`.
   */
  let session: Session | null = null;
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const parsed = parseCookieHeader(cookieHeader);
    if (parsed && parsed["next-auth.session-token"]) {
      const decoded = await decode({
        token: parsed["next-auth.session-token"],
        secret: process.env.NEXT_AUTH_SECRET as string,
      });
      // The decoded cookie looks something like this:
      // name: 'John Wick',
      // email: 'john.wick@example.com',
      // picture: 'https://avatars.githubusercontent.com/u/3402123?v=4',
      // sub: '3402123',
      // iat: 1692767737,
      // exp: 1695359737,
      // jti: '05521708-4403-4636-8ce0-c112187c9859'
      session = await sessionSchema.parseAsync({
        user: {
          name: decoded?.name,
          email: decoded?.email,
          image: decoded?.picture,
        },
        expires: decoded?.exp
          ? new Date(parseInt(decoded.exp as string) * 1000).toISOString()
          : "",
      });
    }
  }
  return json({ session });
};

export const meta: V2_MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
  // Get the session date using NextAuth's useSession hook, which requires
  // the SessionProvider to be set up in app/root.tsx
  const { data: nextAuthSession } = useSession();
  const { session: loaderSession } = useLoaderData<typeof loader>();
  return (
    // If using unocss, install the UnoCSS VSCode extension to get auto-completion
    <div className="w-screen flex flex-col">
      <div className="w-full flex flex-1 flex-col items-center justify-center overflow-clip bg-blue-400 p4">
        <div>
          Using loader to get session info and links to NextAuth REST API
          endpoints to sign in and out.
        </div>
        {loaderSession ? (
          <a href="/api/auth/signout" className="underline">
            sign-out
          </a>
        ) : (
          <a href="/api/auth/signin" className="underline">
            sign-in link
          </a>
        )}
        <pre className="overflow-clip">
          {JSON.stringify(loaderSession, null, 2)}
        </pre>
      </div>
      <div className="w-full flex flex-1 flex-col items-center justify-center overflow-clip bg-red-400 p4">
        <div>
          Using NextAuth SessionProvider to get session info and NextAuth signin
          and signout functions.
        </div>
        {nextAuthSession ? (
          <button
            className="flex-inline items-center gap-x-1 rounded-md p1 transition-all active:scale-95 hover:bg-white"
            onClick={() => {
              signOut();
            }}
          >
            {/* Instal https://marketplace.visualstudio.com/items?itemName=antfu.iconify to see icon preview inline */}
            <div className="i-radix-icons-github-logo h5 w5 color-black" />
            Sign-out using GitHub
          </button>
        ) : (
          <button
            className="flex-inline items-center gap-x-1 rounded-md p1 transition-all active:scale-95 hover:bg-white"
            onClick={() => {
              signIn();
            }}
          >
            <div className="i-radix-icons-github-logo h5 w5 color-black" />
            Sign-in using GitHub
          </button>
        )}
        <pre>{JSON.stringify(nextAuthSession, null, 2)}</pre>
      </div>
    </div>
  );
}
