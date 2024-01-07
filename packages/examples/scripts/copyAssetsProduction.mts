import shell from 'shelljs';

shell.mkdir('-p', './production/models/obj/main/cerberus');
shell.cp('-f', './models/obj/main/cerberus/*', './production/models/obj/main/cerberus/');

shell.mkdir('-p', './production/models/obj/main/female02');
shell.cp('-f', './models/obj/main/female02/*', './production/models/obj/main/female02/');

shell.mkdir('-p', './production/models/obj/main/male02');
shell.cp('-f', './models/obj/main/male02/*', './production/models/obj/main/male02/');

shell.mkdir('-p', './production/models/obj/main/ninja');
shell.cp('-f', './models/obj/main/ninja/*', './production/models/obj/main/ninja/');

shell.mkdir('-p', './production/models/obj/main/verify');
shell.cp('-f', './models/obj/main/verify/*', './production/models/obj/main/verify/');

shell.mkdir('-p', './production/models/obj/main/walt');
shell.cp('-f', './models/obj/main/walt/*', './production/models/obj/main/walt/');

shell.mkdir('-p', './production/assets/worker');
shell.cp('-f', './src/worker/generated/*.js', './production/assets/worker');
shell.cp('-f', '../objloader2/lib/worker/OBJLoader2Worker*.js', './production/assets/worker');
