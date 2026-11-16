import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import leafletCss from "leaflet/dist/leaflet.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Pagina non trovata</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La pagina che cerchi non esiste o è stata spostata.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Torna all'inizio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          La pagina non si è caricata
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Qualcosa è andato storto. Riprova oppure torna all'inizio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Riprova
          </button>
          <a
            href={import.meta.env.BASE_URL}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Torna all'inizio
          </a>
        </div>
      </div>
    </div>
  );
}

// Indirizzo pubblico del sito (impostato dal workflow di GitHub Pages): serve per
// l'anteprima dei link su LinkedIn, WhatsApp ecc., che vuole URL assoluti.
const SITE_URL: string | undefined = import.meta.env.VITE_SITE_URL;
const OG_IMAGE = SITE_URL
  ? `${SITE_URL}og-image.png`
  : "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/0fd09f36-b2c1-4e12-a107-40f310b23b12";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#2b1b5e" },
      { name: "apple-mobile-web-app-title", content: "Padova Explorer" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { title: "Padova Conscious Explorer" },
      {
        name: "description",
        content:
          "Gamification per il turismo sostenibile: esplora Padova, sblocca luoghi nascosti e colleziona badge.",
      },
      { name: "author", content: "Padova Conscious Explorer" },
      { property: "og:title", content: "Padova Conscious Explorer" },
      {
        property: "og:description",
        content:
          "Gamification per il turismo sostenibile: esplora Padova, sblocca luoghi nascosti e colleziona badge.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Padova Conscious Explorer" },
      { name: "twitter:description", content: "Gamification per il turismo sostenibile: esplora Padova, sblocca luoghi nascosti e colleziona badge." },
      ...(SITE_URL
        ? [
            { property: "og:url", content: SITE_URL },
            { property: "og:site_name", content: "Padova Conscious Explorer" },
            { property: "og:locale", content: "it_IT" },
            { property: "og:image:width", content: "1200" },
            { property: "og:image:height", content: "627" },
          ]
        : []),
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "stylesheet",
        href: leafletCss,
      },
      { rel: "icon", href: `${import.meta.env.BASE_URL}favicon.ico`, sizes: "any" },
      { rel: "icon", href: `${import.meta.env.BASE_URL}art/logo.svg`, type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: `${import.meta.env.BASE_URL}apple-touch-icon.png` },
      { rel: "manifest", href: `${import.meta.env.BASE_URL}manifest.webmanifest` },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
