// src/data/defaultFlavorAttributes.ts

import { FlavorAttribute } from '../types/domain';

const now = Date.now();

function root(
  id: string,
  name: string,
  defaultWeight = 1
): FlavorAttribute {
  return {
    id,
    organizationId: null,
    name,
    parentId: null,
    polarity: 'positive',
    defaultWeight,
    createdAt: now,
  };
}

function child(
  id: string,
  name: string,
  parentId: string,
  polarity: FlavorAttribute['polarity'] = 'positive',
  defaultWeight = 1
): FlavorAttribute {
  return {
    id,
    organizationId: null,
    name,
    parentId,
    polarity,
    defaultWeight,
    createdAt: now,
  };
}

export const DEFAULT_FLAVOR_ATTRIBUTES: FlavorAttribute[] = [
  root('cm_floral', 'Floral', 1.1),
  child('cm_floral_rose', 'Rose', 'cm_floral'),
  child('cm_floral_lavender', 'Lavender', 'cm_floral'),
  child('cm_floral_hibiscus', 'Hibiscus', 'cm_floral'),
  child('cm_floral_jasmine', 'Jasmine', 'cm_floral'),
  child('cm_floral_coffee_blossom', 'Coffee Blossom', 'cm_floral'),
  child('cm_floral_chamomile', 'Chamomile', 'cm_floral'),
  child('cm_floral_elderflower', 'Elderflower', 'cm_floral'),
  child('cm_floral_lindenflower', 'Lindenflower', 'cm_floral'),

  root('cm_berry', 'Berry', 1.15),
  child('cm_berry_strawberry', 'Strawberry', 'cm_berry'),
  child('cm_berry_raspberry', 'Raspberry', 'cm_berry'),
  child('cm_berry_blueberry', 'Blueberry', 'cm_berry'),
  child('cm_berry_black_currant', 'Black Currant', 'cm_berry'),
  child('cm_berry_elderberry', 'Elderberry', 'cm_berry'),

  root('cm_fruity', 'Fruity', 1.1),
  child('cm_fruity_citrus', 'Citrus Fruit', 'cm_fruity'),
  child('cm_fruity_lime', 'Lime', 'cm_fruity_citrus'),
  child('cm_fruity_green_apple', 'Green Apple', 'cm_fruity_citrus'),
  child('cm_fruity_grapefruit', 'Grapefruit', 'cm_fruity_citrus'),
  child('cm_fruity_pink_grapefruit', 'Pink Grapefruit', 'cm_fruity_citrus'),

  child('cm_fruity_other', 'Other Fruit', 'cm_fruity'),
  child('cm_fruity_lemon', 'Lemon', 'cm_fruity_other'),
  child('cm_fruity_bergamot', 'Bergamot', 'cm_fruity_other'),
  child('cm_fruity_orange', 'Orange', 'cm_fruity_other'),
  child('cm_fruity_mandarin', 'Mandarin', 'cm_fruity_other'),

  child('cm_fruity_stone', 'Stone Fruit', 'cm_fruity'),
  child('cm_fruity_apricot', 'Apricot', 'cm_fruity_stone'),
  child('cm_fruity_peach', 'Peach', 'cm_fruity_stone'),
  child('cm_fruity_mango', 'Mango', 'cm_fruity_stone'),

  child('cm_fruity_tropical', 'Tropical Fruit', 'cm_fruity'),
  child('cm_fruity_pineapple', 'Pineapple', 'cm_fruity_tropical'),
  child('cm_fruity_honeydew_melon', 'Honeydew Melon', 'cm_fruity_tropical'),

  root('cm_dried_fruit', 'Dried Fruit', 0.95),
  child('cm_dried_fruit_raisin', 'Raisin', 'cm_dried_fruit'),
  child('cm_dried_fruit_prune', 'Prune', 'cm_dried_fruit'),
  child('cm_dried_fruit_dates', 'Dates', 'cm_dried_fruit'),
  child('cm_dried_fruit_cranberry', 'Cranberry', 'cm_dried_fruit'),

  root('cm_sweets', 'Sweets', 1),
  child('cm_sweets_vanilla', 'Vanilla', 'cm_sweets'),
  child('cm_sweets_butterscotch', 'Butterscotch', 'cm_sweets'),
  child('cm_sweets_honey', 'Honey', 'cm_sweets'),
  child('cm_sweets_caramel', 'Caramel', 'cm_sweets'),
  child('cm_sweets_sweet_liquor', 'Sweet Liquor', 'cm_sweets'),

  root('cm_chocolate', 'Chocolate', 1),
  child('cm_chocolate_dark', 'Dark Chocolate', 'cm_chocolate'),
  child('cm_chocolate_milk', 'Milk Chocolate', 'cm_chocolate'),
  child('cm_chocolate_hazelnut', 'Hazelnut', 'cm_chocolate'),

  root('cm_nutty', 'Nutty', 0.9),
  child('cm_nutty_almond', 'Almond', 'cm_nutty'),
  child('cm_nutty_peanut', 'Peanut', 'cm_nutty'),
  child('cm_nutty_walnut', 'Walnut', 'cm_nutty'),
  child('cm_nutty_pecan', 'Pecan', 'cm_nutty'),
  child('cm_nutty_cashew', 'Cashew', 'cm_nutty'),
  child('cm_nutty_pistachio', 'Pistachio', 'cm_nutty'),

  root('cm_roasted', 'Roasted', 0.75),
  child('cm_roasted_bun_bread', 'Bun / Bread', 'cm_roasted', 'neutral', 0.6),
  child('cm_roasted_toast', 'Toast', 'cm_roasted', 'neutral', 0.6),
  child('cm_roasted_tobacco', 'Tobacco', 'cm_roasted', 'neutral', 0.5),
  child('cm_roasted_smoke', 'Smoke', 'cm_roasted', 'negative', 1.1),

  root('cm_industrial', 'Industrial', 1.3),
  child('cm_industrial_rubber', 'Rubber', 'cm_industrial', 'negative', 1.4),
  child('cm_industrial_petroleum', 'Petroleum', 'cm_industrial', 'negative', 1.6),
  child('cm_industrial_medicinal', 'Medicinal', 'cm_industrial', 'negative', 1.4),
  child('cm_industrial_salty', 'Salty', 'cm_industrial', 'negative', 1.1),

  root('cm_spicy', 'Spicy', 0.8),
  child('cm_spicy_pepper', 'Pepper', 'cm_spicy', 'neutral', 0.6),
  child('cm_spicy_coriander_seeds', 'Coriander Seeds', 'cm_spicy', 'neutral', 0.6),
  child('cm_spicy_cardamom', 'Cardamom', 'cm_spicy'),
  child('cm_spicy_nutmeg', 'Nutmeg', 'cm_spicy', 'neutral', 0.6),
  child('cm_spicy_clove', 'Clove', 'cm_spicy', 'neutral', 0.6),
  child('cm_spicy_cinnamon', 'Cinnamon', 'cm_spicy'),
  child('cm_spicy_ginger', 'Ginger', 'cm_spicy', 'neutral', 0.6),

  root('cm_cereal', 'Cereal', 0.7),
  child('cm_cereal_malt', 'Malt', 'cm_cereal', 'neutral', 0.6),
  child('cm_cereal_grain', 'Grain', 'cm_cereal', 'neutral', 0.6),
  child('cm_cereal_cereal', 'Cereal', 'cm_cereal', 'neutral', 0.6),
  child('cm_cereal_grass', 'Grass', 'cm_cereal', 'neutral', 0.6),
  child('cm_cereal_straw', 'Straw', 'cm_cereal', 'negative', 0.8),

  root('cm_green', 'Green', 0.75),
  child('cm_green_hay', 'Hay', 'cm_green', 'negative', 0.8),
  child('cm_green_thyme', 'Thyme', 'cm_green', 'neutral', 0.6),
  child('cm_green_rosemary', 'Rosemary', 'cm_green', 'neutral', 0.6),
  child('cm_green_basil', 'Basil', 'cm_green', 'neutral', 0.6),
  child('cm_green_leaves', 'Green Leaves', 'cm_green', 'neutral', 0.6),

  root('cm_herb_vegetal', 'Herb / Vegetal', 0.75),
  child('cm_herb_vegetal_cucumber', 'Cucumber', 'cm_herb_vegetal', 'neutral', 0.6),
  child('cm_herb_vegetal_garden_peas', 'Garden Peas', 'cm_herb_vegetal', 'neutral', 0.6),
  child('cm_herb_vegetal_fresh_vegetal', 'Fresh Vegetal', 'cm_herb_vegetal', 'neutral', 0.6),
  child('cm_herb_vegetal_asparagus', 'Asparagus', 'cm_herb_vegetal', 'negative', 0.9),
  child('cm_herb_vegetal_spinach', 'Spinach', 'cm_herb_vegetal', 'neutral', 0.6),
];