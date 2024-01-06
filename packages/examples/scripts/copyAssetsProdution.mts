import shell from 'shelljs';

shell.mkdir('-p', './production/worker/generated');
shell.cp('-f', './src/worker/generated/*.js', './production/worker/generated');
shell.cp('-f', './models/obj/female02/*.jpg', './production/assets');
