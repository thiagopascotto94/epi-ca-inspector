import { Library } from '../types';

/**
 * This is the fixed library for production mode.
 * When IS_DEV_MODE in config.ts is false, the application will use this
 * library for all features requiring a knowledge base (Find Similar, Conversion Suggestion).
 */
export const FIXED_LIBRARIES: Library[] = [
  {
    "name": "MARLUVAS",
    "files": [
      {
        "id": "6ceb1a65-a275-4447-acee-647611cad828",
        "url": "https://b2bchamae.com.br/session/iaTrainingData/MARLUVAS/ficha_tecnica_1.txt"
      },
      {
        "id": "85e8b7ad-dab2-45bd-9ccd-c12aea86269d",
        "url": "https://b2bchamae.com.br/session/iaTrainingData/MARLUVAS/ficha_tecnica_2.txt"
      },
      {
        "id": "41db3eda-77a3-4c73-9af3-db1086323503",
        "url": "https://b2bchamae.com.br/session/iaTrainingData/MARLUVAS/ficha_tecnica_3.txt"
      },
      {
        "id": "b39342f1-1c6a-41ec-8199-d3de51610747",
        "url": "https://b2bchamae.com.br/session/iaTrainingData/MARLUVAS/ficha_tecnica_4.txt"
      },
      {
        "id": "875d1e7a-dcfb-451c-99af-1007a3f62473",
        "url": "https://b2bchamae.com.br/session/iaTrainingData/MARLUVAS/ficha_tecnica_5.txt"
      },
      {
        "id": "5ef63626-b18e-41bc-93c7-2686dd122a8d",
        "url": "https://b2bchamae.com.br/session/iaTrainingData/MARLUVAS/ficha_tecnica_6.txt"
      },
      {
        "id": "059c7747-8e95-48b1-8f70-7060b65bc0b6",
        "url": "https://b2bchamae.com.br/session/iaTrainingData/MARLUVAS/ficha_tecnica_7.txt"
      },
      {
        "id": "525d5ce2-34ca-4468-9281-7cc8ec905a73",
        "url": "https://b2bchamae.com.br/session/iaTrainingData/MARLUVAS/ficha_tecnica_8.txt"
      },
      {
        "id": "41f7bee0-c65d-4b52-b676-61dc179c90cb",
        "url": "https://b2bchamae.com.br/session/iaTrainingData/MARLUVAS/ficha_tecnica_9.txt"
      }
    ],
    "id": "035364ed-6aef-490c-8865-83fd460bdafa"
  }
];
