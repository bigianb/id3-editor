import FileSystem from './FileSystem.ts';


export default class ShaderReader {
    fileSystem: FileSystem;

    constructor(fileSystem: FileSystem) {
        this.fileSystem = fileSystem;
    }

    async loadAllShaders() {
        const shaderFiles = this.fileSystem.findFiles('scripts/', '.shader');
        return this.loadShaders(shaderFiles);
    }

    async loadShaders(shaderFiles: string[]) {
        const allShaders: Map<string, any> = new Map();
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

    async load(shaderName: string) {
        // Load the Shader file and parse it
        const data = await this.fileSystem.readFile(shaderName);
        if (!data) {
            return undefined;
        }
        return this.parseShader(data);
    }

    parseShader(data: Buffer) {
        const text = data.toString('utf-8');
        const lines = text.split('\n').map(line => line.trim());
        const shaders: Map<string, any> = new Map();

        let currentShader: any = null;
        let currentStage: any = null;

        let depth = 0;

        for (const line of lines) {
            if (line.startsWith('//') || line === '') {
                continue; // Skip comments and empty lines
            }
            if (!currentShader) {
                currentShader = { name: line, stages: [] };
                shaders.set(currentShader.name, currentShader);
                continue;
            }
            if (line === '{') {
                depth++;
                if (depth === 2) {
                    currentStage = [];
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
                const [key, ...rest] = line.split(' ');
                const value = rest.join(' ');
                currentShader[key] = value;
            } else if (depth === 2) {
                currentStage.push(line);
            } else {
                console.warn('Unexpected line outside of shader/stage:', line);
            }
        }

        return shaders;
    }
}
