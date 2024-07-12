import { trackGet } from "@pucelle/ff";
import { Component } from '@pucelle/lupos.js';
class TestIfStatement extends Component {
    prop1 = '';
    prop2 = '';
    testIf() {
        if ((trackGet(this, "prop1"), this.prop1)) {
            trackGet(this, "prop1");
            return this.prop1;
        }
        else if ((trackGet(this, "prop2"), this.prop2)) {
            trackGet(this, "prop2");
            return this.prop2;
        }
        else
            return '';
    }
}
class TestSwitchBlock extends Component {
    cond = '1';
    prop = 'Text';
    fixedCond() {
        let cond = '1';
        switch (cond) {
            case '1':
                trackGet(this, "prop");
                return this.prop;
            case '2':
                trackGet(this, "prop");
                return this.prop;
        }
        return '';
    }
    variableCond() {
        switch ((trackGet(this, "cond"), this.cond)) {
            case '1':
                trackGet(this, "prop");
                return this.prop;
            case '2':
                trackGet(this, "prop");
                return this.prop;
        }
        return '';
    }
}
class TestForBlock extends Component {
    prop = 1;
    testFor() {
        for (let i = 0; i < 10; i++) {
            this.prop;
            trackGet(this, "prop");
        }
        return '';
    }
    testForInitializer() {
        let i = this.prop;
        for (trackGet(this, "prop"); i < 1; i++) {
            this.prop;
            trackGet(this, "prop");
        }
        return '';
    }
    testForCondition() {
        for (let i = 0; (trackGet(this, "prop"), i < this.prop); i++) {
            this.prop;
            trackGet(this, "prop");
        }
        return '';
    }
    testForIncreasement() {
        for (let i = 0; (trackGet(this, "prop"), i < this.prop); i++) {
            this.prop;
            trackGet(this, "prop");
        }
        return '';
    }
}
class TestWhileBlock extends Component {
    prop = 1;
    testWhile() {
        let i = 0;
        while (i < 10) {
            this.prop;
            trackGet(this, "prop");
        }
        return '';
    }
}
class TestDoWhileBlock extends Component {
    prop = 1;
    testDoWhile() {
        let i = 0;
        do {
            this.prop;
            trackGet(this, "prop");
        } while (i < 10);
        return '';
    }
}
class TestBreakStatement extends Component {
    prop1 = 0;
    prop2 = 0;
    testBreak() {
        for (let i = 0; i < 10; i++) {
            if ((trackGet(this, "prop1"), this.prop1))
                break;
            this.prop2;
            trackGet(this, "prop2");
        }
        return '';
    }
}
class TestContinueStatement extends Component {
    prop1 = 0;
    prop2 = 0;
    testContinue() {
        for (let i = 0; i < 10; i++) {
            if ((trackGet(this, "prop1"), this.prop1))
                continue;
            this.prop2;
            trackGet(this, "prop2");
        }
        return '';
    }
}
class TestAwaitStatement extends Component {
    prop1 = 1;
    prop2 = 2;
    async testAwait() {
        this.prop1;
        trackGet(this, "prop1");
        await Promise.resolve();
        this.prop2;
        trackGet(this, "prop2");
        return '';
    }
}
class TestYieldStatement extends Component {
    prop1 = 1;
    prop2 = 2;
    *testYield() {
        this.prop1;
        trackGet(this, "prop1");
        yield 1;
        this.prop2;
        trackGet(this, "prop2");
    }
}
