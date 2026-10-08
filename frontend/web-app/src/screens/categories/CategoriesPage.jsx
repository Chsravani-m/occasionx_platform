import React, { useState } from 'react';
import { useCategories, useSubCategories } from '../../components/categories/useCategories';
import CategoryItem from '../../components/categories/CategoryItem';
import SubCategoryItem from '../../components/categories/SubCategoryItem';
import CategorySkeleton from '../../components/categories/CategorySkeleton';
import { motion, AnimatePresence } from 'framer-motion';

// Accent colors
const ACCENT_GRADIENT = 'bg-gradient-to-r from-yellow-400 to-blue-600';

export default function CategoriesPage() {
  const { data: categories, loading, error } = useCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState('');

  // Sub-category fetch
  const { data: subCategories, loading: subLoading, error: subError } = useSubCategories(selectedCategoryId);

  // Handlers
  const handleCategoryClick = (cat) => {
    setSelectedCategoryId(cat.id);
    setSelectedCategoryName(cat.name);
  };
  const handleViewProviders = (sub) => {
    window.location.href = `/search?category=${selectedCategoryName}&subcategory=${sub.name}`;
  };

  // Responsive layout: side-by-side on desktop, stacked on mobile
  return (
    <div className="min-h-screen bg-[#0D1117] px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">Explore Event Categories</h1>
          <p className="text-md text-gray-400 mb-2">Find trusted professionals for every celebration</p>
          <nav className="text-xs text-gray-400 mb-2">
            <span className="hover:underline cursor-pointer" onClick={() => setSelectedCategoryId(null)}>Home</span> {'>'} <span>Categories</span>
            {selectedCategoryName && <> {'>'} <span>{selectedCategoryName}</span></>}
          </nav>
        </header>
        <div className="flex flex-col md:flex-row gap-8">
          {/* Category List - horizontal scroll on mobile, grid on desktop */}
          <div className="md:w-1/2 w-full overflow-x-auto">
            <div className="flex md:grid md:grid-cols-2 gap-4">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <CategorySkeleton key={i} />)
              ) : error ? (
                <div className="text-red-500">{error}</div>
              ) : categories.length === 0 ? (
                <div className="text-gray-400">No categories available</div>
              ) : (
                categories.map(cat => (
                  <CategoryItem
                    key={cat.id}
                    category={cat}
                    selected={selectedCategoryId === cat.id}
                    onClick={handleCategoryClick}
                  />
                ))
              )}
            </div>
          </div>
          {/* Subcategory List */}
          <div className="md:w-1/2 w-full">
            <AnimatePresence>
              {selectedCategoryId && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3 }}
                  key={selectedCategoryId}
                >
                  <h2 className="text-xl font-bold text-white mb-2">Subcategories</h2>
                  {subLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <CategorySkeleton key={i} />)
                  ) : subError ? (
                    <div className="text-red-500">{subError}</div>
                  ) : subCategories.length === 0 ? (
                    <div className="text-gray-400">No subcategories available</div>
                  ) : (
                    subCategories.map(sub => (
                      <SubCategoryItem
                        key={sub.id}
                        subcategory={sub}
                        onViewProviders={handleViewProviders}
                        loading={subLoading}
                      />
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
