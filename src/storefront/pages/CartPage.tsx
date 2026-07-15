// Full-page cart (used when config.components.cart === 'page', and as the
// /cart route fallback). Reuses the shared CartContents body.

import { useNavigate } from 'react-router-dom';
import { CartContents } from '../components/Cart';

export const CartPage = () => {
  const navigate = useNavigate();
  return (
    <div className="sf-container py-8 max-w-6xl">
      <CartContents variant="page" onClose={() => navigate(-1)} />
    </div>
  );
};
