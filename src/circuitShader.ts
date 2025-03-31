export const circuitShader = {
  vertexShader: `
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  
  fragmentShader: `
    uniform float time;
    uniform vec2 resolution;
    uniform float opacity;
    varying vec2 vUv;

    #define ITER 20
    
    // Define the color palette
    #define COLOR1 vec3(103.0/255.0, 32.0/255.0, 74.0/255.0)     // #67204a
    #define COLOR2 vec3(80.0/255.0, 25.0/255.0, 65.0/255.0)      // #501941
    #define COLOR3 vec3(91.0/255.0, 25.0/255.0, 86.0/255.0)      // #5b1956
    #define COLOR4 vec3(150.0/255.0, 49.0/255.0, 153.0/255.0)    // #963199
    #define COLOR5 vec3(0.0/255.0, 0.0/255.0, 0.0/255.0)         // #000000
    
    // Repeat function that ensures smooth wrapping
    vec2 repeat(vec2 p, vec2 c) {
      return mod(p, c) - 0.5 * c;
    }
    
    vec2 circuit(vec2 p) {
      // Properly wrap using repeat
      p = mod(p, 1.0);
      
      float r = 0.123;
      float v = 0.0, g = 0.0;
      r = fract(r * 9184.928);
      float cp, d;
      
      d = p.x;
      g += pow(clamp(1.0 - abs(d), 0.0, 1.0), 160.0);
      d = p.y;
      g += pow(clamp(1.0 - abs(d), 0.0, 1.0), 160.0);
      d = p.x - 1.0;
      g += pow(clamp(1.0 - abs(d), 0.0, 1.0), 160.0);
      d = p.y - 1.0;
      g += pow(clamp(1.0 - abs(d), 0.0, 1.0), 160.0);
      
      for(int i = 0; i < ITER; i ++) {
        cp = 0.5 + (r - 0.5) * 0.9;
        d = p.x - cp;
        g += pow(clamp(1.0 - abs(d), 0.0, 1.0), 160.0);
        if(d > 0.0) {
          r = fract(r * 4829.013);
          p.x = (p.x - cp) / (1.0 - cp);
          v += 1.0;
        } else {
          r = fract(r * 1239.528);
          p.x = p.x / cp;
        }
        p = p.yx;
      }
      
      v /= float(ITER);
      
      return vec2(v, g);
    }

    float rand12(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    vec2 rand22(vec2 p) {
      return vec2(
        rand12(p),
        rand12(p + vec2(31.139, 17.591))
      );
    }

    float noise12(vec2 p) {
      vec2 fl = floor(p);
      vec2 fr = fract(p);
      fr = fr * fr * (3.0 - 2.0 * fr); // Hermite interpolation
      
      float a = rand12(fl);
      float b = rand12(fl + vec2(1.0, 0.0));
      float c = rand12(fl + vec2(0.0, 1.0));
      float d = rand12(fl + vec2(1.0, 1.0));
      
      return mix(
        mix(a, b, fr.x),
        mix(c, d, fr.x),
        fr.y
      );
    }

    float fbm12(vec2 p) {
      float sum = 0.0;
      float amp = 0.5;
      float freq = 1.0;
      
      for(int i = 0; i < 4; i++) {
        sum += noise12(p * freq) * amp;
        amp *= 0.5;
        freq *= 2.0;
        p = p + vec2(1.0, 3.3); // Add some variation to avoid straight patterns
      }
      
      return sum;
    }
      
    vec3 voronoi(in vec2 x) {
      vec2 n = floor(x); // grid cell id
      vec2 f = fract(x); // grid internal position
      vec2 mg; // shortest distance...
      vec2 mr; // ..and second shortest distance
      float md = 8.0, md2 = 8.0;
      
      for(int j = -1; j <= 1; j ++) {
        for(int i = -1; i <= 1; i ++) {
          vec2 g = vec2(float(i), float(j)); // cell id
          vec2 o = rand22(n + g); // offset to edge point
          vec2 r = g + o - f;
          
          float d = max(abs(r.x), abs(r.y)); // distance to the edge
          
          if(d < md) {
            md2 = md; md = d; mr = r; mg = g;
          } else if(d < md2) {
            md2 = d;
          }
        }
      }
      return vec3(n + mg, md2 - md);
    }

    vec2 rotate(vec2 p, float a) {
      float c = cos(a);
      float s = sin(a);
      return vec2(
        p.x * c - p.y * s,
        p.x * s + p.y * c
      );
    }

    float xor(float a, float b) {
      return min(max(-a, b), max(a, -b));
    }

    float fr2(vec2 uv) {
      float v = 1e38, dfscl = 1.0;
      
      vec4 rnd = vec4(0.1, 0.3, 0.7, 0.8);
      
      #define RNDA rnd = fract(sin(rnd * 11.1111) * 2986.3971)
      #define RNDB rnd = fract(cos(rnd * 11.1111) * 2986.3971)
      
      RNDA;
      
      for(int i = 0; i < 8; i++) {
        vec2 p = uv;
        
        float si = 1.0 + rnd.x;
        p = (abs(fract(p / si) - 0.5)) * si;
        vec2 q = p;
        float w = max(q.x - rnd.y * 0.7, q.y - rnd.z * 0.7);
        w /= dfscl;
        v = xor(v, w);
        
        if(w < 0.0) {
          RNDA;
        } else {
          RNDB;
        }
        
        float sii = 1.2;
        
        uv *= sii;
        uv -= rnd.xz;
        dfscl *= sii;
      }
      return v;
    }

    vec3 pixel(vec2 fragCoord) {
      // Calculate UVs based on continuous coordinate space
      // This will help eliminate the seam
      vec2 uv = fragCoord / resolution.xy;
      
      // Convert to -1 to 1 range
      uv = 2.0 * uv - 1.0;
      
      // Correct aspect ratio
      uv.x *= resolution.x / resolution.y;
      
      // Time-based animation
      float t = time * 0.1;
      
      // Rotate and translate the UVs
      uv = rotate(uv, sin(t) * 0.1);
      uv += t * vec2(0.5, 1.0);
      
      // Apply circuit pattern with proper wrapping
      // Use a smaller scale to make pattern less sensitive to edges
      vec2 ci = circuit(uv * 0.1);
      
      // Calculate voronoi pattern
      vec3 vo = voronoi(uv);
      
      float f = 80.0;
      
      float cf = 0.1;
      vec2 fr = (fract(uv / cf) - 0.5) * cf;
      float cir = length(fr) - 0.03;
      
      // Combine patterns
      float v;
      v = min(cos(vo.z * f), cir * 50.0) + ci.y;
      
      float ww = fr2(uv / 1.5) * 1.5;
      v = max(v, smoothstep(0.0, 0.01, ww - ci.y * 0.03));
      
      v = smoothstep(0.2, 0.0, v);

      // Map value to color palette
      vec3 col;
      if (v > 0.95) {
        col = COLOR4; // Brightest highlights
      } else if (v > 0.7) {
        col = mix(COLOR4, COLOR1, (v - 0.7) / 0.25);
      } else if (v > 0.4) {
        col = mix(COLOR1, COLOR3, (v - 0.4) / 0.3);
      } else if (v > 0.2) {
        col = mix(COLOR3, COLOR2, (v - 0.2) / 0.2);
      } else {
        col = mix(COLOR2, COLOR5, v / 0.2);
      }
      
      return col;
    }

    void main() {
      // Generate coordinates based on resolution
      vec2 fragCoord = vUv * resolution;
      
      // Apply anti-aliasing by sampling 4 points
      vec2 h = vec2(0.5, 0.0);
      vec3 col = pixel(fragCoord + h.yy);
      col += pixel(fragCoord + h.xy);
      col += pixel(fragCoord + h.yx);
      col += pixel(fragCoord + h.xx);
      col /= 4.0;
      
      // Apply vignette effect
      vec2 uv = vUv * 2.0 - 1.0;
      float vignette = (1.0 - pow(abs(uv.x), 2.1)) * (1.0 - pow(abs(uv.y), 2.1));
      col *= vignette;
      
      // Final color with opacity
      gl_FragColor = vec4(col, opacity);
    }
  `
};