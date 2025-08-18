import {techConfig as config} from "./config.js";

export const logDebug = (...args) => config.isDebug && console.log(...args)