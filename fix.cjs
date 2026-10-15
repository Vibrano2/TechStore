const fs = require('fs');

const replaceInFile = (file, replacements) => {
  let content = fs.readFileSync(file, 'utf8');
  replacements.forEach(([search, replace]) => {
    content = content.replace(search, replace);
  });
  fs.writeFileSync(file, content);
};

replaceInFile('src/App.tsx', [['import React from \'react\';\n', '']]);
replaceInFile('src/components/layout/Layout.tsx', [['import React from \'react\';\n', '']]);
replaceInFile('src/context/ShopContext.tsx', [
  ['import React, { createContext, useContext, useState, useEffect, ReactNode } from \'react\';', 'import { createContext, useContext, useState, useEffect, type ReactNode } from \'react\';'],
  ['import { Product, CartItem } from \'../types\';', 'import type { Product, CartItem } from \'../types\';']
]);
replaceInFile('src/data/mockProducts.ts', [['import { Product } from \'../types\';', 'import type { Product } from \'../types\';']]);
replaceInFile('src/pages/Account.tsx', [['import React, { useState } from \'react\';', 'import { useState } from \'react\';']]);
replaceInFile('src/pages/Cart.tsx', [
  ['import React from \'react\';\n', ''],
  ['import { Trash2, ArrowRight } from \'lucide-react\';', 'import { Trash2, ArrowRight, Shield } from \'lucide-react\';'],
  ['../../context/ShopContext', '../context/ShopContext']
]);
replaceInFile('src/pages/Category.tsx', [
  ['import React from \'react\';\n', ''],
  ['../../data/mockProducts', '../data/mockProducts']
]);
replaceInFile('src/pages/Checkout.tsx', [
  ['import React, { useState } from \'react\';', 'import { useState } from \'react\';'],
  ['../../context/ShopContext', '../context/ShopContext']
]);
replaceInFile('src/pages/Home.tsx', [
  ['import React from \'react\';\n', ''],
  ['../../data/mockProducts', '../data/mockProducts']
]);
replaceInFile('src/pages/ProductDetail.tsx', [
  ['import React, { useState } from \'react\';', 'import { useState } from \'react\';'],
  ['import { ShoppingCart, Heart, Shield, Truck, Clock } from \'lucide-react\';', 'import { Heart, Shield, Truck } from \'lucide-react\';'],
  ['../../data/mockProducts', '../data/mockProducts'],
  ['../../context/ShopContext', '../context/ShopContext']
]);
replaceInFile('src/pages/Wishlist.tsx', [
  ['import React from \'react\';\n', ''],
  ['../../context/ShopContext', '../context/ShopContext']
]);
