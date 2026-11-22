import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import Root from '@containers/root';
import NotFound from '@containers/404';
import Test from '@containers/test';
import Design from '@containers/design';
import { Providers } from './providers';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    errorElement: <NotFound />,
  },
  {
    path: '/test',
    element: <Test />,
  },
  ...(import.meta.env.DEV ? [{ path: '/design', element: <Design /> }] : []),
]);

export const App: React.FC = () => {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
};

export default App;
