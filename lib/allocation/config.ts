export const config = {
  allocation: {
    // Arbitrary constants to control objective function weighting
    A: 1, // project preference
    B: 0.5, // role (BE/FE) preference
    C: 1.1, // BE experience
    D: 1.1, // FE experience
    E: 0.1, // Priority
    F: 20, // Project requests
    numAscents: 5,
  },
};

export type Config = typeof config;
