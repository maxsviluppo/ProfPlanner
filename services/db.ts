import { supabase } from './supabaseClient';
import { Course, Institute } from '../types';

// --- MAPPING HELPERS ---

const mapCourseFromDB = (row: any): Course => ({
  id: row.id,
  name: row.name,
  code: row.code || '',
  instituteId: row.institute_id,
  date: row.date,
  startTime: row.start_time,
  endTime: row.end_time,
  modality: row.modality as 'PRESENZA' | 'DAD',
  notes: row.notes || '',
  topics: row.topics || '',
  completed: row.completed || false,
  isPaid: row.is_paid || false
});

const mapCourseToDB = (course: Course, userId: string) => ({
  id: course.id,
  user_id: userId,
  institute_id: course.instituteId,
  name: course.name,
  code: course.code,
  date: course.date,
  start_time: course.startTime,
  end_time: course.endTime,
  modality: course.modality,
  notes: course.notes,
  topics: course.topics,
  completed: course.completed,
  is_paid: course.isPaid
});

const mapInstituteFromDB = (row: any): Institute => ({
  id: row.id,
  name: row.name,
  color: row.color,
  defaultRate: row.default_rate,
  rateType: row.rate_type as 'HOURLY' | 'PER_LESSON'
});

const mapInstituteToDB = (inst: Institute, userId: string) => ({
  id: inst.id,
  user_id: userId,
  name: inst.name,
  color: inst.color,
  default_rate: inst.defaultRate,
  rate_type: inst.rateType
});

// --- DB SERVICE ---

export const db = {
  auth: {
    getUserId: async (): Promise<string | null> => {
      const { data } = await supabase.auth.getSession();
      return data.session?.user.id || null;
    }
  },

  courses: {
    getAll: async (): Promise<Course[]> => {
      const { data, error } = await supabase.from('pp_courses').select('*');
      if (error) throw error;
      return data.map(mapCourseFromDB);
    },

    create: async (course: Course): Promise<void> => {
      const userId = await db.auth.getUserId();
      if (!userId) throw new Error("Utente non autenticato");
      
      const { error } = await supabase.from('pp_courses').insert(mapCourseToDB(course, userId));
      if (error) throw error;
    },

    createMany: async (courses: Course[]): Promise<void> => {
       const userId = await db.auth.getUserId();
       if (!userId) throw new Error("Utente non autenticato");
       
       const mapped = courses.map(c => mapCourseToDB(c, userId));
       const { error } = await supabase.from('pp_courses').insert(mapped);
       if (error) throw error;
    },

    update: async (course: Course): Promise<void> => {
      const userId = await db.auth.getUserId();
      if (!userId) throw new Error("Utente non autenticato");
      
      // We don't change user_id on update usually, but mapping includes it.
      const { error } = await supabase
        .from('pp_courses')
        .update(mapCourseToDB(course, userId))
        .eq('id', course.id);
        
      if (error) throw error;
    },
    
    upsertMany: async (courses: Course[]): Promise<void> => {
       const userId = await db.auth.getUserId();
       if (!userId) throw new Error("Utente non autenticato");

       const mapped = courses.map(c => mapCourseToDB(c, userId));
       const { error } = await supabase.from('pp_courses').upsert(mapped);
       if (error) throw error;
    },

    delete: async (id: string): Promise<void> => {
      const { error } = await supabase.from('pp_courses').delete().eq('id', id);
      if (error) throw error;
    },

    deleteAll: async (): Promise<void> => {
      const userId = await db.auth.getUserId();
      // Delete all belonging to user
      const { error } = await supabase.from('pp_courses').delete().eq('user_id', userId);
      if (error) throw error;
    }
  },
  
  institutes: {
    getAll: async (): Promise<Institute[]> => {
      const { data, error } = await supabase.from('pp_institutes').select('*');
      if (error) throw error;
      return data.map(mapInstituteFromDB);
    },

    create: async (institute: Institute): Promise<void> => {
      const userId = await db.auth.getUserId();
      if (!userId) throw new Error("Utente non autenticato");

      const { error } = await supabase.from('pp_institutes').insert(mapInstituteToDB(institute, userId));
      if (error) throw error;
    },
    
    createMany: async (institutes: Institute[]): Promise<void> => {
      const userId = await db.auth.getUserId();
      if (!userId) throw new Error("Utente non autenticato");
      
      const mapped = institutes.map(i => mapInstituteToDB(i, userId));
      const { error } = await supabase.from('pp_institutes').insert(mapped);
      if (error) throw error;
    },

    update: async (institute: Institute): Promise<void> => {
      const userId = await db.auth.getUserId();
      if (!userId) throw new Error("Utente non autenticato");

      const { error } = await supabase
        .from('pp_institutes')
        .update(mapInstituteToDB(institute, userId))
        .eq('id', institute.id);
      if (error) throw error;
    },

    delete: async (id: string): Promise<void> => {
      const { error } = await supabase.from('pp_institutes').delete().eq('id', id);
      if (error) throw error;
    },

    deleteAll: async (): Promise<void> => {
       const userId = await db.auth.getUserId();
       const { error } = await supabase.from('pp_institutes').delete().eq('user_id', userId);
       if (error) throw error;
    }
  }
};