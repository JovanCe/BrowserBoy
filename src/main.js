/**
 * @author Jovan Cejovic <jovan.cejovic@gmail.com>
 */

import {message} from './util';
import {CPU} from './cpu';

let app = (name) => message(name);

app("jovan");
let cpu = new CPU(null);
cpu.LDrrAB();
cpu.LDrrBC();
console.log(cpu._clock);