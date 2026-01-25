import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { IntegrationHierarchy } from '../../hooks/useOrganization';

interface Props {
    hierarchy?: IntegrationHierarchy | null;
}

export function IntegrationGraph({ hierarchy }: Props) {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mountRef.current) return;

        const width = mountRef.current.clientWidth || 800;
        const height = 360;
        const scene = new THREE.Scene();
        scene.background = null;

        const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
        camera.position.set(0, 0, 65);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));

        mountRef.current.innerHTML = '';
        mountRef.current.appendChild(renderer.domElement);

        const ambient = new THREE.AmbientLight(0xffffff, 0.9);
        scene.add(ambient);
        const directional = new THREE.DirectionalLight(0xffffff, 0.5);
        directional.position.set(0, 0, 50);
        scene.add(directional);

        const orgColor = new THREE.Color('#2563eb');
        const formColor = new THREE.Color('#f97316');
        const inheritColor = new THREE.Color('#14b8a6');

        const orgMaterial = new THREE.MeshStandardMaterial({ color: orgColor });
        const orgNode = new THREE.Mesh(new THREE.SphereGeometry(2.8, 32, 32), orgMaterial);
        scene.add(orgNode);

        const forms = hierarchy?.forms || [];
        const orgIntegrations = hierarchy?.organizationIntegrations || [];

        const radius = 16;
        forms.forEach((form, index) => {
            const angle = (index / Math.max(forms.length, 1)) * Math.PI * 2;
            const pos = new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
            const hasOverrides = form.integrations.length > 0;
            const formMaterial = new THREE.MeshStandardMaterial({ color: hasOverrides ? formColor : inheritColor });
            const formNode = new THREE.Mesh(new THREE.SphereGeometry(1.8, 24, 24), formMaterial);
            formNode.position.copy(pos);
            scene.add(formNode);

            const formLine = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), pos]),
                new THREE.LineBasicMaterial({ color: 0x94a3b8 })
            );
            scene.add(formLine);

            const effective = form.effectiveIntegrations || [];
            const integrationRadius = 4;

            effective.forEach((integration, idx) => {
                const theta = angle + (idx / Math.max(effective.length, 1)) * Math.PI / 1.5;
                const integPos = new THREE.Vector3(
                    pos.x + Math.cos(theta) * integrationRadius,
                    pos.y + Math.sin(theta) * integrationRadius,
                    (idx % 2 === 0 ? 1 : -1) * 1.2
                );
                const color = integration.scope === 'form' ? formColor : inheritColor;
                const node = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 18), new THREE.MeshStandardMaterial({ color }));
                node.position.copy(integPos);
                scene.add(node);

                const line = new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints([pos, integPos]),
                    new THREE.LineBasicMaterial({ color: 0xcbd5e1 })
                );
                scene.add(line);
            });
        });

        if (orgIntegrations.length) {
            orgIntegrations.forEach((integration, idx) => {
                const ringRadius = 7;
                const angle = (idx / orgIntegrations.length) * Math.PI * 2;
                const pos = new THREE.Vector3(Math.cos(angle) * ringRadius, Math.sin(angle) * ringRadius, 0);
                const node = new THREE.Mesh(new THREE.SphereGeometry(1.1, 18, 18), new THREE.MeshStandardMaterial({ color: orgColor }));
                node.position.copy(pos);
                scene.add(node);

                const line = new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), pos]),
                    new THREE.LineBasicMaterial({ color: 0xcbd5e1 })
                );
                scene.add(line);
            });
        }

        let frameId: number;
        const animate = () => {
            frameId = requestAnimationFrame(animate);
            scene.rotation.z += 0.0008;
            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            if (!mountRef.current) return;
            const newWidth = mountRef.current.clientWidth || width;
            camera.aspect = newWidth / height;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, height);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
            if (mountRef.current) {
                mountRef.current.innerHTML = '';
            }
        };
    }, [hierarchy]);

    return (
        <div ref={mountRef} className="w-full h-[360px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-b-xl border-t border-muted/60" />
    );
}
