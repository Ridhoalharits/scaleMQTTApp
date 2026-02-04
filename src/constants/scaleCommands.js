export const SCALE_MANUFACTURERS = {
  METTLER: "mettler",
  SARTORIUS: "sartorius",
};

export const COMMAND_SETS = {
  [SCALE_MANUFACTURERS.METTLER]: {
    label: "Mettler Toledo",
    commands: {
      START: "SIR\r\n",
      STOP: "@\r\n",
      ZERO: "Z\r\n",
      TARE: "T\r\n",
      GET_SERIAL: "I4\r\n",
    },
  },
  [SCALE_MANUFACTURERS.SARTORIUS]: {
    label: "Sartorius",
    commands: {
      // Common SBI (Sartorius Balance Interface) commands
      START: "GW\r\n", // ESC P (Print)
      STOP: "",  // ESC R (Reset/Stop) - NOTE: Sartorius continuous mode often stopped by sending break or specific command depending on model. ESC R is a guess for generic, usually it's just stopping the print trigger.
      ZERO: "V\r\n",  // ESC Z (Zero) - Tar/Zero combined often
      TARE: "T\r\n",  // ESC T (Tare)
      GET_SERIAL: "GSN\r\n", // Generic query, often model specific.
    },
  },
};
