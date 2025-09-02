import { Plugin } from 'enmity/api/plugins';

export default class SimplePlugin extends Plugin {
    onStart() {
        console.log('Plugin loaded!');
    }

    onStop() {
        console.log('Plugin stopped!');
    }
}
