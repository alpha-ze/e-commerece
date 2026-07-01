import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App';

describe('App smoke test', () => {
  it('renders without throwing', () => {
    // App uses <Routes> internally, so it must be wrapped in a router.
    expect(() => {
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>,
      );
    }).not.toThrow();
  });
});
