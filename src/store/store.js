import create from 'zustand';

const useStore = create((set) => ({
  course_selected: undefined,
  setCourse_selected: (newData) => set({ course_selected: newData }),
}));

export default useStore;