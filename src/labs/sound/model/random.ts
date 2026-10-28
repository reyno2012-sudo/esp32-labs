/** Roughly normal noise, mean 0, standard deviation 1 (four uniforms, as the firmware's test signals). */
export const gauss = () =>
  (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.73;
