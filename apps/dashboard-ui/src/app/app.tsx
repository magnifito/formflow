import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { OrganizationProvider } from './hooks/useOrganizationContext';

export function App() {
  return (
    <OrganizationProvider>
      <RouterProvider router={router} />
    </OrganizationProvider>
  );
}

export default App;
