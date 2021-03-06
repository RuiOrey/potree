
Potree.VolumeTool = class VolumeTool extends THREE.EventDispatcher {
	constructor (viewer) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.addEventListener('start_inserting_volume', e => {
			this.viewer.dispatchEvent({
				type: 'cancel_insertions'
			});
		});

		this.scene = new THREE.Scene();
		this.scene.name = 'scene_volume';

		this.viewer.inputHandler.registerInteractiveScene(this.scene);

		this.onRemove = e => {
			this.scene.remove(e.volume);
		};

		this.onAdd = e => {
			this.scene.add(e.volume);
		};

		for(let volume of viewer.scene.volumes){
			this.onAdd({volume: volume});
		}

		this.viewer.inputHandler.addEventListener('delete', e => {
			let volumes = e.selection.filter(e => (e instanceof Potree.Volume));
			volumes.forEach(e => this.viewer.scene.removeVolume(e));
		});

		viewer.addEventListener("update", this.update.bind(this));
		viewer.addEventListener("render.pass.scene", e => this.render(e));
		viewer.addEventListener("scene_changed", this.onSceneChange.bind(this));

		viewer.scene.addEventListener('volume_added', this.onAdd);
		viewer.scene.addEventListener('volume_removed', this.onRemove);
	}

	onSceneChange(e){
		if(e.oldScene){
			e.oldScene.removeEventListeners('volume_added', this.onAdd);
			e.oldScene.removeEventListeners('volume_removed', this.onRemove);
		}

		e.scene.addEventListener('volume_added', this.onAdd);
		e.scene.addEventListener('volume_removed', this.onRemove);
	}

	startInsertion (args = {}) {
		let volume = new Potree.Volume();
		volume.clip = args.clip || false;
		volume.name = args.name || 'Volume';

		this.dispatchEvent({
			type: 'start_inserting_volume',
			volume: volume
		});

		this.viewer.scene.addVolume(volume);
		this.scene.add(volume);

		let cancel = {
			callback: null
		};

		let drag = e => {
			let camera = this.viewer.scene.getActiveCamera();
			
			let I = Potree.utils.getMousePointCloudIntersection(
				e.drag.end, 
				this.viewer.scene.getActiveCamera(), 
				this.viewer, 
				this.viewer.scene.pointclouds);

			if (I) {
				volume.position.copy(I.location);

				var wp = volume.getWorldPosition().applyMatrix4(camera.matrixWorldInverse);
				// var pp = new THREE.Vector4(wp.x, wp.y, wp.z).applyMatrix4(camera.projectionMatrix);
				var w = Math.abs((wp.z / 10));
				volume.scale.set(w, w, w);
			}
		};

		let drop = e => {
			volume.removeEventListener('drag', drag);
			volume.removeEventListener('drop', drop);

			cancel.callback();
		};

		cancel.callback = e => {
			volume.removeEventListener('drag', drag);
			volume.removeEventListener('drop', drop);
			this.viewer.removeEventListener('cancel_insertions', cancel.callback);
		};

		volume.addEventListener('drag', drag);
		volume.addEventListener('drop', drop);
		this.viewer.addEventListener('cancel_insertions', cancel.callback);

		this.viewer.inputHandler.startDragging(volume);

		return volume;
	}

	update(){
		if (!this.viewer.scene) {
			return;
		}
		
		let camera = this.viewer.scene.getActiveCamera();
		let clientWidth = this.viewer.renderer.getSize().width;
		let clientHeight = this.viewer.renderer.getSize().height;

		let volumes = this.viewer.scene.volumes;
		for (let volume of volumes) {
			let label = volume.label;
			
			{

				let distance = label.position.distanceTo(camera.position);
				let pr = Potree.utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);

				let scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			}

			let text = Potree.utils.addCommas(volume.getVolume().toFixed(3)) + '\u00B3';
			label.setText(text);
		}
	}

	render(params){
		this.viewer.renderer.render(this.scene, this.viewer.scene.getActiveCamera(), params.renderTarget);
	}

};
