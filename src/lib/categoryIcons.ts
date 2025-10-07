import { Shirt, Book, Home, Monitor, Gem, Utensils, Car, Heart, Sparkles, Package, ShoppingBag, Tag, Box, Component, Dna, FlaskConical, Flower, Gamepad2, Globe, Hammer, Lamp, Leaf, Microscope, Music, Paintbrush, PawPrint, Plane, Puzzle, Rocket, Scissors, ScrollText, Shield, Snowflake, Tent, ToyBrick, TreePine, Watch, Wrench } from 'lucide-react';

export const getCategoryIcon = (category: string | null | undefined) => {
  const lowerCategory = category?.toLowerCase();
  switch (lowerCategory) {
    case 'clothing':
    case 'apparel':
    case 'fashion':
      return Shirt;
    case 'books':
    case 'literature':
      return Book;
    case 'home decor':
    case 'furniture':
    case 'homeware':
      return Home;
    case 'electronics':
    case 'gadgets':
    case 'tech':
      return Monitor;
    case 'jewelry':
    case 'accessories':
      return Gem;
    case 'food':
    case 'beverages':
    case 'groceries':
      return Utensils;
    case 'automotive':
    case 'vehicles':
      return Car;
    case 'health':
    case 'beauty':
    case 'wellness':
      return Heart;
    case 'art':
    case 'crafts':
      return Paintbrush;
    case 'toys':
    case 'games':
      return Gamepad2;
    case 'sports':
    case 'outdoors':
      return Tent;
    case 'pets':
    case 'animals':
      return PawPrint;
    case 'music':
    case 'instruments':
      return Music;
    case 'travel':
    case 'luggage':
      return Plane;
    case 'science':
    case 'education':
      return FlaskConical;
    case 'tools':
    case 'hardware':
      return Hammer;
    case 'plants':
    case 'gardening':
      return Leaf;
    case 'watches':
    case 'clocks':
      return Watch;
    case 'gifts':
    case 'novelty':
      return Gift;
    case 'vintage':
    case 'antiques':
      return ScrollText;
    case 'eco-friendly':
    case 'sustainable':
      return TreePine;
    case 'custom':
    case 'personalized':
      return Sparkles;
    case 'baby':
    case 'kids':
      return ToyBrick;
    case 'seasonal':
    case 'holiday':
      return Snowflake;
    case 'security':
    case 'safety':
      return Shield;
    case 'components':
    case 'parts':
      return Component;
    case 'chemicals':
    case 'laboratory':
      return Dna;
    case 'lighting':
      return Lamp;
    case 'global':
    case 'international':
      return Globe;
    case 'space':
    case 'astronomy':
      return Rocket;
    case 'diy':
    case 'hobby':
      return Scissors;
    case 'generic product':
    default:
      return Package; // Generic icon
  }
};