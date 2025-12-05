import { Course, Institute } from '../types';

/**
 * DB SERVICE (Database Layer Abstraction)
 * 
 * Questo servizio astrae la logica di salvataggio dati.
 * Attualmente usa localStorage per persistenza locale, ma le funzioni sono asincrone (async/await).
 * Questo lo rende "Database Compatible": in futuro basterà cambiare il contenuto di queste funzioni
 * per collegarsi a Supabase, Firebase o API REST senza rompere l'app.
 */

const KEYS = {
  COURSES: 'profplanner_courses_v1',
  INSTITUTES: 'profplanner_institutes_v1'
};

export const db = {
  courses: {
    getAll: async (): Promise<Course[]> => {
      // Simuliamo una piccola latenza di rete se volessimo, ma per ora è istantaneo
      const data = localStorage.getItem(KEYS.COURSES);
      return data ? JSON.parse(data) : [];
    },
    saveAll: async (courses: Course[]): Promise<void> => {
      localStorage.setItem(KEYS.COURSES, JSON.stringify(courses));
    },
    // Esempio di metodo "futuro" per salvare singolo record
    add: async (course: Course): Promise<void> => {
      const current = await db.courses.getAll();
      current.push(course);
      await db.courses.saveAll(current);
    }
  },
  
  institutes: {
    getAll: async (): Promise<Institute[]> => {
      const data = localStorage.getItem(KEYS.INSTITUTES);
      return data ? JSON.parse(data) : [];
    },
    saveAll: async (institutes: Institute[]): Promise<void> => {
      localStorage.setItem(KEYS.INSTITUTES, JSON.stringify(institutes));
    }
  }
};