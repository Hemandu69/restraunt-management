import { useMemo, useState } from "react";
import { MENU_CATEGORIES, MENU_ITEMS } from "../../data/menu";
import { MenuItemCard } from "./MenuItemCard";
import { EmptyState } from "../EmptyState";

interface MenuBrowserProps {
  quantities: Record<string, number>;
  onAdd: (itemId: string) => void;
  onIncrement: (itemId: string) => void;
  onDecrement: (itemId: string) => void;
}

const ALL_CATEGORY = "all";

export function MenuBrowser({ quantities, onAdd, onIncrement, onDecrement }: MenuBrowserProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const available = MENU_ITEMS.filter((item) => item.available);

    // A search in progress looks across every category - switching back to
    // browsing by category only makes sense once the search is cleared.
    if (query) {
      return available.filter((item) => item.name.toLowerCase().includes(query));
    }
    if (activeCategory === ALL_CATEGORY) {
      return available;
    }
    return available.filter((item) => item.categoryId === activeCategory);
  }, [search, activeCategory]);

  return (
    <div className="pos-menu-panel">
      <div className="pos-toolbar">
        <div className="search-field">
          <span className="search-field-icon" aria-hidden="true">
            ⌕
          </span>
          <input
            type="search"
            placeholder="Search menu…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search menu items"
          />
        </div>

        {!search && (
          <div className="category-tabs" role="tablist" aria-label="Menu categories">
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === ALL_CATEGORY}
              className={`category-tab${activeCategory === ALL_CATEGORY ? " active" : ""}`}
              onClick={() => setActiveCategory(ALL_CATEGORY)}
            >
              All
            </button>
            {MENU_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={activeCategory === category.id}
                className={`category-tab${activeCategory === category.id ? " active" : ""}`}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {visibleItems.length === 0 ? (
        <EmptyState icon="⌕" title="No items found" description={`Nothing matches "${search}". Try a different search.`} />
      ) : (
        <div className="menu-grid">
          {visibleItems.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              quantity={quantities[item.id] ?? 0}
              onAdd={() => onAdd(item.id)}
              onIncrement={() => onIncrement(item.id)}
              onDecrement={() => onDecrement(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
