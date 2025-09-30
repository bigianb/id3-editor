
export interface ShaderStage
{
    lines: string[];
    map?: string;
    blendFunc?: string;
    rgbGen?: string;
    alphaGen?: string;
    tcGen?: string;
    tcMod?: string[];
}

export interface Shader
{
    name: string;
    params: string[];
    stages: ShaderStage[];
}