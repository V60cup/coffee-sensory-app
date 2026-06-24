// src/scoring/__manual_test__.ts

import { computeScore } from './engine';
import { indexAttributesById } from '../services/flavorAttributeService';
import { DEFAULT_FLAVOR_ATTRIBUTES } from '../data/defaultFlavorAttributes';

import {
  DEFAULT_PROFILE_SIMPLE_CATA,
  DEFAULT_PROFILE_SCA_LIKE,
  DEFAULT_PROFILE_DEFECT_WEIGHTED,
} from './profiles/defaults';

const attributesById = indexAttributesById(DEFAULT_FLAVOR_ATTRIBUTES);

console.log('--- Caso 1: catador entusiasta, solo positivos, perfil SIMPLE_CATA ---');
console.log(
  computeScore({
    selections: [
      { attributeId: 'fruit_berry_blueberry', intensity: 4 },
      { attributeId: 'sweet_caramel', intensity: 3 },
      { attributeId: 'floral_jasmine', intensity: 2 },
    ],
    attributesById,
    profile: DEFAULT_PROFILE_SIMPLE_CATA,
  })
);

console.log('--- Caso 2: mismo catador, perfil SCA_LIKE ---');
console.log(
  computeScore({
    selections: [
      { attributeId: 'fruit_berry_blueberry', intensity: 8 },
      { attributeId: 'sweet_caramel', intensity: 6 },
      { attributeId: 'floral_jasmine', intensity: 4 },
    ],
    attributesById,
    profile: DEFAULT_PROFILE_SCA_LIKE,
  })
);

console.log('--- Caso 3: defecto fuerte, perfil DEFECT_WEIGHTED ---');
console.log(
  computeScore({
    selections: [
      { attributeId: 'fruit_citrus_lemon', intensity: 3 },
      { attributeId: 'defect_phenolic', intensity: 4 },
    ],
    attributesById,
    profile: DEFAULT_PROFILE_DEFECT_WEIGHTED,
  })
);

console.log('--- Caso 4: sin descriptores seleccionados devuelve baseline ---');
console.log(
  computeScore({
    selections: [],
    attributesById,
    profile: DEFAULT_PROFILE_SIMPLE_CATA,
  })
);