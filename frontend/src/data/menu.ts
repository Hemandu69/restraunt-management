import type { MenuCategory, MenuItem } from "../types/menu";

// Local seed dataset standing in for the future menu_categories/menu_items
// backend module (Manager-managed, Waiter-read-only - see root README).
// Not duplicated anywhere else; every screen that needs the menu imports
// from here.
export const MENU_CATEGORIES: MenuCategory[] = [
  { id: "starters", name: "Starters" },
  { id: "main-course", name: "Main Course" },
  { id: "breads", name: "Breads" },
  { id: "rice-biryani", name: "Rice & Biryani" },
  { id: "beverages", name: "Beverages" },
  { id: "desserts", name: "Desserts" },
];

export const MENU_ITEMS: MenuItem[] = [
  // Starters
  { id: "st-01", categoryId: "starters", name: "Paneer Tikka", description: "Char-grilled cottage cheese, tandoori spices", price: 280, available: true },
  { id: "st-02", categoryId: "starters", name: "Chicken Tikka", description: "Char-grilled marinated chicken", price: 320, available: true },
  { id: "st-03", categoryId: "starters", name: "Veg Spring Rolls", description: "Crisp rolls with stir-fried vegetables", price: 220, available: true },
  { id: "st-04", categoryId: "starters", name: "Hara Bhara Kebab", description: "Spinach and green pea patties", price: 240, available: true },
  { id: "st-05", categoryId: "starters", name: "Chicken 65", description: "Spicy deep-fried chicken, curry leaves", price: 300, available: true },
  { id: "st-06", categoryId: "starters", name: "Tandoori Chicken (Half)", description: "Classic clay-oven roasted chicken", price: 350, available: true },
  { id: "st-07", categoryId: "starters", name: "Aloo Tikki Chaat", description: "Potato patties, tangy chutneys, yogurt", price: 180, available: true },
  { id: "st-08", categoryId: "starters", name: "Chilli Paneer", description: "Indo-Chinese tossed cottage cheese", price: 260, available: true },
  { id: "st-09", categoryId: "starters", name: "Fish Amritsari", description: "Batter-fried fish, ajwain and spices", price: 340, available: true },
  { id: "st-10", categoryId: "starters", name: "Onion Rings", description: "Crispy battered onion rings", price: 180, available: true },

  // Main Course
  { id: "mc-01", categoryId: "main-course", name: "Butter Chicken", description: "Tomato-butter gravy, tandoori chicken", price: 380, available: true },
  { id: "mc-02", categoryId: "main-course", name: "Kadai Paneer", description: "Cottage cheese, bell peppers, kadai masala", price: 300, available: true },
  { id: "mc-03", categoryId: "main-course", name: "Paneer Butter Masala", description: "Rich cashew-tomato gravy", price: 320, available: true },
  { id: "mc-04", categoryId: "main-course", name: "Dal Makhani", description: "Slow-cooked black lentils, butter, cream", price: 260, available: true },
  { id: "mc-05", categoryId: "main-course", name: "Chicken Curry", description: "Home-style onion-tomato chicken curry", price: 340, available: true },
  { id: "mc-06", categoryId: "main-course", name: "Palak Paneer", description: "Cottage cheese in spiced spinach puree", price: 290, available: true },
  { id: "mc-07", categoryId: "main-course", name: "Chana Masala", description: "Spiced chickpea curry", price: 220, available: true },
  { id: "mc-08", categoryId: "main-course", name: "Mutton Rogan Josh", description: "Kashmiri-style slow-cooked mutton curry", price: 420, available: true },
  { id: "mc-09", categoryId: "main-course", name: "Malai Kofta", description: "Paneer-potato dumplings, creamy gravy", price: 310, available: true },
  { id: "mc-10", categoryId: "main-course", name: "Egg Curry", description: "Boiled eggs in spiced onion-tomato gravy", price: 240, available: true },
  { id: "mc-11", categoryId: "main-course", name: "Handi Paneer", description: "Cottage cheese simmered in clay-pot gravy", price: 320, available: true },

  // Breads
  { id: "br-01", categoryId: "breads", name: "Butter Naan", description: "Tandoor-baked leavened bread, butter", price: 60, available: true },
  { id: "br-02", categoryId: "breads", name: "Plain Naan", description: "Tandoor-baked leavened bread", price: 50, available: true },
  { id: "br-03", categoryId: "breads", name: "Garlic Naan", description: "Naan topped with garlic and coriander", price: 70, available: true },
  { id: "br-04", categoryId: "breads", name: "Tandoori Roti", description: "Whole-wheat clay-oven bread", price: 30, available: true },
  { id: "br-05", categoryId: "breads", name: "Lachha Paratha", description: "Layered whole-wheat flatbread", price: 70, available: true },
  { id: "br-06", categoryId: "breads", name: "Missi Roti", description: "Spiced gram-flour flatbread", price: 50, available: true },
  { id: "br-07", categoryId: "breads", name: "Stuffed Kulcha", description: "Naan stuffed with spiced potato", price: 90, available: true },

  // Rice & Biryani
  { id: "rb-01", categoryId: "rice-biryani", name: "Chicken Biryani", description: "Dum-cooked basmati rice, spiced chicken", price: 320, available: true },
  { id: "rb-02", categoryId: "rice-biryani", name: "Veg Biryani", description: "Dum-cooked basmati rice, mixed vegetables", price: 260, available: true },
  { id: "rb-03", categoryId: "rice-biryani", name: "Mutton Biryani", description: "Dum-cooked basmati rice, spiced mutton", price: 400, available: true },
  { id: "rb-04", categoryId: "rice-biryani", name: "Jeera Rice", description: "Basmati rice tempered with cumin", price: 150, available: true },
  { id: "rb-05", categoryId: "rice-biryani", name: "Steamed Rice", description: "Plain basmati rice", price: 120, available: true },
  { id: "rb-06", categoryId: "rice-biryani", name: "Egg Biryani", description: "Dum-cooked basmati rice, boiled eggs", price: 260, available: true },
  { id: "rb-07", categoryId: "rice-biryani", name: "Veg Pulao", description: "Basmati rice, whole spices, vegetables", price: 220, available: true },

  // Beverages
  { id: "bv-01", categoryId: "beverages", name: "Coke", description: "330 ml", price: 60, available: true },
  { id: "bv-02", categoryId: "beverages", name: "Sprite", description: "330 ml", price: 60, available: true },
  { id: "bv-03", categoryId: "beverages", name: "Fresh Lime Soda", description: "Sweet or salted", price: 90, available: true },
  { id: "bv-04", categoryId: "beverages", name: "Masala Chaas", description: "Spiced buttermilk", price: 70, available: true },
  { id: "bv-05", categoryId: "beverages", name: "Water Bottle", description: "1 litre, packaged", price: 30, available: true },
  { id: "bv-06", categoryId: "beverages", name: "Mango Lassi", description: "Yogurt, mango pulp", price: 110, available: true },
  { id: "bv-07", categoryId: "beverages", name: "Cold Coffee", description: "Blended with ice cream", price: 130, available: true },
  { id: "bv-08", categoryId: "beverages", name: "Masala Chai", description: "Spiced milk tea", price: 50, available: true },

  // Desserts
  { id: "ds-01", categoryId: "desserts", name: "Gulab Jamun", description: "Two pieces, warm sugar syrup", price: 90, available: true },
  { id: "ds-02", categoryId: "desserts", name: "Rasmalai", description: "Two pieces, saffron milk", price: 110, available: true },
  { id: "ds-03", categoryId: "desserts", name: "Vanilla Ice Cream", description: "Two scoops", price: 80, available: true },
  { id: "ds-04", categoryId: "desserts", name: "Chocolate Brownie", description: "Served warm", price: 150, available: true },
  { id: "ds-05", categoryId: "desserts", name: "Kulfi", description: "Traditional Indian ice cream, pistachio", price: 100, available: true },
  { id: "ds-06", categoryId: "desserts", name: "Gajar Ka Halwa", description: "Slow-cooked carrot dessert", price: 120, available: true },
  { id: "ds-07", categoryId: "desserts", name: "Kheer", description: "Rice pudding, cardamom, nuts", price: 100, available: true },
];
