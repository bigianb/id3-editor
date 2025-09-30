import FileSystem from './FileSystem.ts';
import { Shader, ShaderStage } from './Shaders.types.ts';

export default class ShaderReader {
    fileSystem: FileSystem;

    constructor(fileSystem: FileSystem) {
        this.fileSystem = fileSystem;
    }

    async loadAllShaders(): Promise<Map<string, Shader>> {
        const shaderFiles = this.fileSystem.findFiles('scripts/', '.shader');
        return this.loadShaders(shaderFiles);
    }

    async loadShaders(shaderFiles: string[]): Promise<Map<string, Shader>> {
        const allShaders: Map<string, Shader> = new Map();
        for (const shaderFile of shaderFiles) {
            const shaders = await this.load(shaderFile);
            if (shaders) {
                for (const [name, shader] of shaders) {
                    allShaders.set(name, shader);
                }
            }
        }
        return allShaders;
    }

    async load(shaderName: string): Promise<Map<string, Shader> | undefined> {
        // Load the Shader file and parse it
        const data = await this.fileSystem.readFile(shaderName);
        if (!data) {
            return undefined;
        }
        const shader = this.parseShader(data);
        if (!shader) {
            console.warn('Failed to parse shader file:', shaderName);
            return undefined;
        }
        return shader;
    }

    parseShader(data: Buffer) {
        const text = data.toString('utf-8');
        const lines = text.split('\n').map(line => line.trim());
        const shaders: Map<string, Shader> = new Map();

        let currentShader: Shader | null = null;
        let currentStage: ShaderStage | null = null;

        let depth = 0;

        for (const line of lines) {
            if (line.startsWith('//') || line === '') {
                continue; // Skip comments and empty lines
            }
            if (!currentShader) {
                currentShader = { name: line, params: [], stages: [] };
                shaders.set(currentShader.name, currentShader);
                continue;
            }
            if (line.startsWith('{')) {
                depth++;
                if (depth === 3){
                    // We see this in rtcw. It's a bad shader. A closing brace is commented out.
                    // assume the last stage is done.
                    depth = 2;
                }
                const rest = line.substring(1).trim();
                if (depth === 1 && rest.length > 0) {
                    currentShader.params.push(rest);
                }
                if (depth === 2) {
                    currentStage = {lines: []};
                    if (rest.length > 0) {
                        currentStage.lines.push(rest);
                    }
                    currentShader.stages.push(currentStage);
                }
            } else if (line === '}') {
                depth--;
                if (depth === 0) {
                    currentShader = null;
                } else if (depth === 1) {
                    currentStage = null;
                }
            } else if (depth === 1) {
                currentShader.params.push(line);
            } else if (depth === 2) {
                currentStage?.lines.push(line);
            } else {
                console.warn('Unexpected line depth '+depth+' outside of shader/stage:', line);

                return null;
            }
        }

        return shaders;
    }
}
