// components/ProductCard.tsx
import React from 'react';
import { Product } from '@/types';
import { formatRupiah } from '@/utils/currency';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock < 5;
  const placeholderImage = "https://placehold.co/600x400/e2e8f0/1e293b?text=No+Image";

  const optimizeCloudinaryUrl = (url: string) => {
    if (!url || !url.includes('cloudinary.com')) return url;
    return url.replace('/upload/', '/upload/q_auto,f_auto/');
  };

  return (
    <Card className={`w-full h-auto self-start transition-all hover:shadow-md ${isOutOfStock ? 'opacity-60' : ''}`}>
      <CardHeader className="p-3 pb-2 space-y-1">
        <div className="flex justify-between items-center gap-1">
          <Badge variant="secondary" className="text-[10px] px-2 py-0.5 truncate max-w-[65%]">
            {product.category || 'Umum'}
          </Badge>
          
          {isOutOfStock ? (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">Habis</Badge>
          ) : isLowStock ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-red-500 border-red-200 bg-red-50">
              Sisa {product.stock}
            </Badge>
          ) : (
             <span className="text-[11px] text-muted-foreground whitespace-nowrap">Stok: {product.stock}</span>
          )}
        </div>
        
        <CardTitle className="text-sm font-semibold leading-snug line-clamp-2">
          {product.name}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-3 py-1 space-y-2">
        <div className="relative w-full aspect-square bg-slate-50 rounded-md overflow-hidden flex items-center justify-center border">
            <img 
                src={optimizeCloudinaryUrl(product.image) || placeholderImage} 
                alt={product.name}
                className="h-full w-full object-cover transition-transform hover:scale-105"
                onError={(e) => {
                    e.currentTarget.src = placeholderImage;
                }}
            />
        </div>

        <p className="font-bold text-base text-slate-900">
          {formatRupiah(product.price)}
        </p>
      </CardContent>

      <CardFooter className="p-3 pt-1">
        <Button 
          className="w-full h-9 text-xs font-semibold" 
          variant={isOutOfStock ? "secondary" : "default"}
          disabled={isOutOfStock}
          onClick={() => onAddToCart(product)}
        >
          {isOutOfStock ? 'Stok Habis' : 'Tambah +'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;