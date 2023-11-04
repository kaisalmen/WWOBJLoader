import shell from 'shelljs';

const versionPattern = '.*[0-9]\\.[0-9]\\.[0-9].*';

const version_wtd_core_real = '~2.4.0-next.4';
const version_wtd_core_dev = '../../../wtd/packages/wtd-core';

const version_wtd_three_ext_real = '~2.4.0-next.4';
const version_wtd_three_ext_dev = '../../../wtd/packages/wtd-three-ext';

const what = process.argv[2];

const setDevVersions = () => {
    console.log('Updating to dev versions...');
    shell.sed('-i', `"wtd-core": "${versionPattern}"`, `"wtd-core": "${version_wtd_core_dev}"`, 'packages/objloader2/package.json');
    shell.sed('-i', `"wtd-three-ext": "${versionPattern}"`, `"wtd-three-ext": "${version_wtd_three_ext_dev}"`, 'packages/objloader2/package.json');
    shell.sed('-i', `"wtd-core": "${versionPattern}"`, `"wtd-core": "${version_wtd_core_dev}"`, 'packages/examples/package.json');
    shell.sed('-i', `"wtd-three-ext": "${versionPattern}"`, `"wtd-three-ext": "${version_wtd_three_ext_dev}"`, 'packages/examples/package.json');
};

const setRealVersions = () => {
    console.log('Updating to real versions...');
    shell.sed('-i', `"wtd-core": "${version_wtd_core_dev}"`, `"wtd-core": "${version_wtd_core_real}"`, 'packages/objloader2/package.json');
    shell.sed('-i', `"wtd-three-ext": "${version_wtd_three_ext_dev}"`, `"wtd-three-ext": "${version_wtd_three_ext_real}"`, 'packages/objloader2/package.json');
    shell.sed('-i', `"wtd-core": "${version_wtd_core_dev}"`, `"wtd-core": "${version_wtd_core_real}"`, 'packages/examples/package.json');
    shell.sed('-i', `"wtd-three-ext": "${version_wtd_three_ext_dev}"`, `"wtd-three-ext": "${version_wtd_three_ext_real}"`, 'packages/examples/package.json');
};

const reinstall = () => {
    console.log('Preforming reinstall...');
    shell.rm('package-lock.json');
    shell.rm('-fr', 'node_modules/wtd-core');
    shell.rm('-fr', 'node_modules/wtd-three-ext');
    shell.rm('-fr', 'packages/objloader2/node_modules');
    shell.rm('-fr', 'packages/examples/node_modules');

    shell.exec('npm i');
    shell.exec('npm ci');
};

const fullReinstall = () => {
    console.log('Preforming reinstall...');
    shell.rm('package-lock.json');
    shell.rm('-fr', 'node_modules');
    shell.rm('-fr', 'packages/objloader2/node_modules');
    shell.rm('-fr', 'packages/examples/node_modules');
};

if (what === 'dev') {
    setDevVersions();
    reinstall();
}

if (what === 'real') {
    setRealVersions();
    reinstall();
}

if (what === 'reinstall') {
    fullReinstall();
}
