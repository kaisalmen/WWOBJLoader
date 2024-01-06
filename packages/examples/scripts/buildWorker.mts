import shell from 'shelljs';

shell.rm('-f', './src/worker/generated/BasicExampleOffscreenWorker*.js');
shell.exec('vite -c build/vite.config.BasicExampleOffscreenWorker.ts build');
