import type { AppProps } from 'next/app';
import type { Router } from 'next/router';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { DENIAL_PROP, withDenialPage } from './index.js';

/** A custom App with a layout around every page. */
function App({ Component, pageProps }: AppProps): ReactNode {
  return createElement('main', null, createElement(Component, pageProps));
}

function Article({ title }: { title: string }): ReactNode {
  return createElement('h1', null, title);
}

/** Renders `app` as Next.js would render the custom App for `pageProps`. */
function render(app: (props: AppProps) => ReactNode, pageProps: object) {
  return renderToStaticMarkup(
    createElement(app, {
      Component: Article,
      pageProps,
      router: {} as Router,
    }),
  );
}

describe('withDenialPage', () => {
  it('renders the page when its props carry no denial', () => {
    expect(render(withDenialPage(App), { title: 'Hello' })).toBe(
      '<main><h1>Hello</h1></main>',
    );
  });

  it("renders Next.js's error page with the denial's status, inside the App", () => {
    const html = render(withDenialPage(App), {
      [DENIAL_PROP]: { statusCode: 403, message: 'Insufficient permissions.' },
    });
    expect(html).toMatch(/^<main>.*<\/main>$/);
    expect(html).toContain('403');
    expect(html).toContain('Forbidden');
    expect(html).not.toContain('<h1>Hello');
  });

  it("renders the app's own error page when given one", () => {
    const ErrorPage = ({ statusCode }: { statusCode: number }): ReactNode =>
      createElement('p', null, `Error ${statusCode}`);
    expect(
      render(withDenialPage(App, { ErrorPage }), {
        [DENIAL_PROP]: { statusCode: 401, message: 'No user.' },
      }),
    ).toBe('<main><p>Error 401</p></main>');
  });
});
