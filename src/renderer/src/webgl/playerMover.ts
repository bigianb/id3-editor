import { vec3 } from 'gl-matrix';

export default class PlayerMover
{
    velocity: vec3 = [0, 0, 0];
    position: vec3 = [0, 0, 0];

    stopspeed: number = 100.0;
    acceleration: number = 10.0;
    airAcceleration: number = 0.1;
    flyAcceleration: number = 8.0;

    friction: number = 6.0;
    flightFriction: number = 3.0;
    isOnGround: boolean = true;
    movementFrametime: number = 0.30;
    overclip: number = 0.501;
    stepsize: number = 18;
    gravity: number = 20;
    playerRadius: number = 10;

    scale: number = 50;

    constructor() { }

    applyFriction()
    {
        if (!this.isOnGround) { return; }

        const speed = vec3.length(this.velocity);

        let drop = 0;

        const control = speed < this.stopspeed ? this.stopspeed : speed;
        drop += control * this.friction * this.movementFrametime;

        let newSpeed = speed - drop;
        if (newSpeed < 0) {
            newSpeed = 0;
        }
        if (speed !== 0) {
            newSpeed /= speed;
            vec3.scale(this.velocity, this.velocity, newSpeed);
        } else {
            this.velocity = [0, 0, 0];
        }
    };

    clipVelocity(velIn: vec3, normal: vec3): vec3
    {
        let backoff = vec3.dot(velIn, normal);

        if (backoff < 0) {
            backoff *= this.overclip;
        } else {
            backoff /= this.overclip;
        }

        const change = vec3.scale([0, 0, 0], normal, backoff);
        return vec3.subtract(change, velIn, change);
    };


    move(dir: number[], frameTime: number)
    {
        //console.log(`Moving in direction: ${dir} for frame time: ${frameTime}`);
        this.movementFrametime = frameTime * 0.0075;

        //this.groundCheck();

        vec3.normalize(dir, dir);

        this.flyMove(dir);
/*
        if (this.isOnGround) {
            this.walkMove(dir);
        } else {
            this.airMove(dir);
        }
*/
        return this.position;
    }

    flyMove(dir)
    {
        this.applyFriction();
        const speed = vec3.length(dir) * this.scale;

        this.accelerate(dir, speed, this.flyAcceleration);
        vec3.add(this.position, this.position, vec3.scale([0, 0, 0], this.velocity, this.movementFrametime));
    }

    airMove(dir)
    {
        
        const speed = vec3.length(dir) * this.scale;

        this.accelerate(dir, speed, this.airAcceleration);

        this.stepSlideMove(true);
    };

    walkMove(dir)
    {
        this.applyFriction();

        const speed = vec3.length(dir) * this.scale;

        this.accelerate(dir, speed, this.acceleration);

        this.velocity = this.clipVelocity(this.velocity, this.groundTrace.plane.normal);

        if (!this.velocity[0] && !this.velocity[1]) { return; }

        this.stepSlideMove(false);
    };

    slideMove(gravity: boolean)
    {
        const numbumps = 4;
        const planes:vec3[] = [];
        const endVelocity: vec3 = [0, 0, 0];

        if (gravity) {
            vec3.copy(endVelocity, this.velocity);
            endVelocity[2] -= this.gravity * this.movementFrametime;
            this.velocity[2] = (this.velocity[2] + endVelocity[2]) * 0.5;

            if (this.groundTrace?.plane) {
                // slide along the ground plane
                this.velocity = this.clipVelocity(this.velocity, this.groundTrace.plane.normal);
            }
        }

        // never turn against the ground plane
        if (this.groundTrace?.plane) {
            planes.push(vec3.copy([0, 0, 0], this.groundTrace.plane.normal));
        }

        // never turn against original velocity
        planes.push(vec3.normalize([0, 0, 0], this.velocity));

        let time_left = this.movementFrametime;
        const end = [0, 0, 0];
        let bumpcount;
        for (bumpcount = 0; bumpcount < numbumps; ++bumpcount) {

            // calculate position we are trying to move to
            vec3.add(end, this.position, vec3.scale([0, 0, 0], this.velocity, time_left));

            // see if we can make it there
            const trace = bsp.trace(this.position, end, this.playerRadius);

            if (trace.allSolid) {
                // entity is completely trapped in another solid
                this.velocity[2] = 0;   // don't build up falling damage, but allow sideways acceleration
                return true;
            }

            if (trace.fraction > 0) {
                // actually covered some distance
                vec3.copy(this.position, trace.endPos);
            }

            if (trace.fraction == 1) {
                break;     // moved the entire distance
            }

            time_left -= time_left * trace.fraction;

            planes.push(vec3.copy([0, 0, 0], trace.plane.normal));

            //
            // modify velocity so it parallels all of the clip planes
            //

            // find a plane that it enters
            for (let i = 0; i < planes.length; ++i) {
                const into = vec3.dot(this.velocity, planes[i]);
                if (into >= 0.1) { continue; } // move doesn't interact with the plane

                // slide along the plane
                let clipVelocity = this.clipVelocity(this.velocity, planes[i]);
                let endClipVelocity = this.clipVelocity(endVelocity, planes[i]);

                // see if there is a second plane that the new move enters
                for (let j = 0; j < planes.length; j++) {
                    if (j == i) { continue; }
                    if (vec3.dot(clipVelocity, planes[j]) >= 0.1) { continue; } // move doesn't interact with the plane

                    // try clipping the move to the plane
                    clipVelocity = this.clipVelocity(clipVelocity, planes[j]);
                    endClipVelocity = this.clipVelocity(endClipVelocity, planes[j]);

                    // see if it goes back into the first clip plane
                    if (vec3.dot(clipVelocity, planes[i]) >= 0) { continue; }

                    // slide the original velocity along the crease
                    const dir = [0, 0, 0];
                    vec3.cross(dir, planes[i], planes[j]);
                    vec3.normalize(dir, dir);
                    let d = vec3.dot(dir, this.velocity);
                    vec3.scale(clipVelocity, dir, d);

                    vec3.cross(dir, planes[i], planes[j]);
                    vec3.normalize(dir, dir);
                    d = vec3.dot(dir, endVelocity);
                    vec3.scale(endClipVelocity, dir, d);

                    // see if there is a third plane the the new move enters
                    for (let k = 0; k < planes.length; ++k) {
                        if (k == i || k == j) { continue; }
                        if (vec3.dot(clipVelocity, planes[k]) >= 0.1) { continue; } // move doesn't interact with the plane

                        // stop dead at a tripple plane interaction
                        this.velocity = [0, 0, 0];
                        return true;
                    }
                }

                // if we have fixed all interactions, try another move
                vec3.copy(this.velocity, clipVelocity);
                vec3.copy(endVelocity, endClipVelocity);
                break;
            }
        }

        if (gravity) {
            vec3.copy(this.velocity, endVelocity);
        }

        return (bumpcount !== 0);
    };

    stepSlideMove(gravity: boolean)
    {
        const start_o = vec3.copy([0, 0, 0], this.position);
        const start_v = vec3.copy([0, 0, 0], this.velocity);

        if (!this.slideMove(gravity)) { return; } // we got exactly where we wanted to go first try

        const down = vec3.copy([0, 0, 0], start_o);
        down[2] -= this.stepsize;
        let trace = bsp.trace(start_o, down, this.playerRadius);

        const up = [0, 0, 1];

        // never step up when you still have up velocity
        if (this.velocity[2] > 0 && (trace.fraction == 1.0 || vec3.dot(trace.plane.normal, up) < 0.7)) { return; }

        vec3.copy(up, start_o);
        up[2] += this.stepsize;

        // test the player position if they were a stepheight higher
        trace = bsp.trace(start_o, up, this.playerRadius);
        if (trace.allSolid) { return; } // can't step up

        const stepSize = trace.endPos[2] - start_o[2];
        // try slidemove from this position
        vec3.copy(this.position, trace.endPos);
        vec3.copy(this.velocity, start_v);

        this.slideMove(gravity);

        // push down the final amount
        vec3.copy(down, this.position);
        down[2] -= stepSize;
        trace = bsp.trace(this.position, down, this.playerRadius);
        if (!trace.allSolid) {
            vec3.copy(this.position, trace.endPos);
        }
        if (trace.fraction < 1.0) {
            this.velocity = this.clipVelocity(this.velocity, trace.plane.normal);
        }
    };

    accelerate(dir, speed, accel)
    {
        const currentSpeed = vec3.dot(this.velocity, dir);
        const addSpeed = speed - currentSpeed;
        if (addSpeed <= 0) {
            return;
        }

        let accelSpeed = accel * this.movementFrametime * speed;
        if (accelSpeed > addSpeed) {
            accelSpeed = addSpeed;
        }

        const accelDir = vec3.scale([0, 0, 0], dir, accelSpeed);
        vec3.add(this.velocity, this.velocity, accelDir);
    };

    jump()
    {

    }

}
