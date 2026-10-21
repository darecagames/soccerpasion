import { Scene } from 'phaser';
import { loadAssets, prepareKits } from '../render/Assets';
export class Boot extends Scene {
    constructor() { super('Boot'); }
    preload() {
        const label = this.add.text(960, 540, 'SOCCERPASIÓN\nPREPARANDO EL ESTADIO…', {
            fontFamily: 'monospace', fontSize: 32, color: '#e9e6d0', align: 'center', lineSpacing: 20,
        }).setOrigin(.5);
        this.load.on('loaderror', () => label.setText('No se ha podido cargar un recurso.\nRecarga la página para reintentar.'));
        loadAssets(this);
    }
    create() { prepareKits(this); this.scene.start('MainMenu'); }
}
