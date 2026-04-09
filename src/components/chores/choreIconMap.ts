import {
  UtensilsCrossed, Droplets, Bed, Flower2, WashingMachine, PawPrint, ShoppingBag, Package,
  Trash2, Wrench, Leaf, Home, Car, Heart, Baby, Scissors, BookOpen, Dumbbell, Zap, Archive,
  Coffee, Shirt, CheckSquare, Sparkles, Tv, ShoppingCart, Dog, Bike, Snowflake,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const CHORE_ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed, Droplets, Bed, Flower2, WashingMachine, PawPrint, ShoppingBag, Package,
  Trash2, Wrench, Leaf, Home, Car, Heart, Baby, Scissors, BookOpen, Dumbbell, Zap, Archive,
  Coffee, Shirt, CheckSquare, Sparkles, Tv, ShoppingCart, Dog, Bike, Snowflake,
};

export const CHORE_ICON_OPTIONS = Object.keys(CHORE_ICON_MAP);
