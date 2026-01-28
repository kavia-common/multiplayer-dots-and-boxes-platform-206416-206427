import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Dots & Boxes header', () => {
  render(<App />);
  const title = screen.getByText(/Dots & Boxes/i);
  expect(title).toBeInTheDocument();
});
