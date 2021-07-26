import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });
  const previousCartRef = useRef<Product[]>()

  useEffect(() => {
    previousCartRef.current = cart
  })

  const cartPreviousValue = previousCartRef.current ?? cart

  useEffect(() => {
    if(cartPreviousValue  !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    }
  },[cart, cartPreviousValue])

  const addProduct = async (productId: number) => {
    try {
      const newCart = [...cart]
      const productExistsInCart = newCart.find(product => product.id === productId)

      const stock = await api.get(`stock/${productId}`)
      const stockAmount = stock.data.amount
      const currentAmount = productExistsInCart ? productExistsInCart.amount : 0
      const amount = currentAmount + 1

      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      if(productExistsInCart) {
        productExistsInCart.amount = amount
      } else {
        const product = await api.get(`/products/${productId}`)

        const newProduct = {
          ...product.data,
          amount: 1
        }
        newCart.push(newProduct)
      }

      setCart(newCart)

    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = [...cart]
      const productExistsInCart = newCart.findIndex(product => product.id === productId)

      if(productExistsInCart >= 0){
        newCart.splice(productExistsInCart, 1)
        setCart(newCart)
      } else {
        throw Error()
      }
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) return

      const stock = await api.get(`stock/${productId}`)
      const stockAmount = stock.data.amount

      if(amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque')
        return
      }
      
      const newCart = [...cart]
      const productExistsInCart = newCart.find(product => product.id === productId)

      if(productExistsInCart) {
        productExistsInCart.amount = amount
        setCart(newCart)
      } else {
        throw Error()
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
