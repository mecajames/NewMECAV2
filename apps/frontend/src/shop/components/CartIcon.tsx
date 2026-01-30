import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';

export function CartIcon() {
  const { itemCount } = useCart();

  return (
    <Link
      to="/shop/cart"
      className="relative p-2 text-gray-300 hover:text-white transition-colors"
      title="Shopping Cart"
    >
      <ShoppingCart className="h-6 w-6" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-orange-500 text-white text-xs font-bold rounded-full">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  );
}

export default CartIcon;
