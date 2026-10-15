import '../styles/globals.css';

import { withDenialPage } from '@jperezmart/next-casl';
import type { AppProps } from 'next/app';

import { AbilityProvider } from '../lib/client-casl';

/**
 * No `fetchRules`: `<AbilityProvider>` fetches the default Rules endpoint path,
 * `/api/me/abilities`, with the session cookie, once in the browser. The rules
 * never travel through page props.
 */
function App({ Component, pageProps }: AppProps): React.JSX.Element {
  return (
    <AbilityProvider>
      <Component {...pageProps} />
    </AbilityProvider>
  );
}

// A page whose `getServerSideProps` answered 401 or 403 renders Next.js's
// error page, inside this App, instead of the page.
export default withDenialPage(App);
